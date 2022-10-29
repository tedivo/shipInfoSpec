import {
  ILCGOptionsIntermediate,
  ITGCOptionsIntermediate,
  IVGCOptionsIntermediate,
} from "../../models/v1/parts/IShipData";
import ValuesSourceEnum, {
  ValuesSourceRowTierEnum,
} from "../../models/base/enums/ValuesSourceEnum";

import ForeAftEnum from "../../models/base/enums/ForeAftEnum";
import { IBayLevelDataStaf } from "../../models/v1/parts/IBayLevelData";
import { IIsoRowPattern } from "../../models/base/types/IPositionPatterns";
import LcgReferenceEnum from "../../models/base/enums/LcgReferenceEnum";
import PortStarboardEnum from "../../models/base/enums/PortStarboardEnum";
import { TContainerLengths } from "../../models/v1/parts/Types";

export const ONE_MILLIMETER_IN_FEET = 0.003280839895;

/**
 * Remaps LCG to AFT Perp
 * @param bls
 * @param lcgOptions
 * @param vcgOptions
 */
export function cgsRemap(
  bls: IBayLevelDataStaf[],
  lcgOptions: ILCGOptionsIntermediate,
  vcgOptions: IVGCOptionsIntermediate,
  tcgOptions: ITGCOptionsIntermediate
) {
  if (lcgOptions.values === ValuesSourceEnum.KNOWN) remapLcgs(lcgOptions, bls);
  if (vcgOptions.values === ValuesSourceRowTierEnum.BY_TIER)
    remapVcgs(vcgOptions, bls);
  if (tcgOptions.values === ValuesSourceEnum.KNOWN) remapTcgs(tcgOptions, bls);
}

/**
 * Remaps VCGs from BY_TIER to BY_STACK. Mutates the object.
 * @param tcgOptions
 * @param bls
 */
function remapTcgs(
  tcgOptions: ITGCOptionsIntermediate,
  bls: IBayLevelDataStaf[]
) {
  const tcgSignMult =
    tcgOptions.direction === PortStarboardEnum.STARBOARD ? 1 : -1;

  bls.forEach((bl) => {
    const perRowInfoEach = bl.perRowInfo.each;
    const rows = Object.keys(perRowInfoEach) as IIsoRowPattern[];

    rows.forEach((row) => {
      const tcg = perRowInfoEach[row].tcg;
      if (tcg !== undefined) perRowInfoEach[row].tcg = tcgSignMult * tcg;
    });
  });
}

/**
 * Remaps VCGs from BY_TIER to BY_STACK. Mutates the object.
 * @param vcgOptions
 * @param bls
 */
function remapVcgs(
  vcgOptions: IVGCOptionsIntermediate,
  bls: IBayLevelDataStaf[]
) {
  const baseAdjust = Math.round(
    (8.5 / ONE_MILLIMETER_IN_FEET) * (vcgOptions.heightFactor || 0)
  );

  bls.forEach((bl) => {
    const perRowInfoEach = bl.perRowInfo.each;
    const perTierInfo = bl.perTierInfo;

    const rows = Object.keys(perRowInfoEach) as IIsoRowPattern[];
    rows.forEach((row) => {
      const bottomIsoTier = perRowInfoEach[row].bottomIsoTier;
      const vcg = perTierInfo[bottomIsoTier]?.vcg;
      if (vcg !== undefined) {
        const bottomBase = vcg - baseAdjust;
        perRowInfoEach[row].bottomBase = bottomBase;
      }
    });
    // Important: as "perTierInfo" is used many times, cgsRemap should only
    // be used last in the conversion process.
    delete bl.perTierInfo;
  });
}

/**
 * Remaps LCG to AFT Perp. Mutates the object.
 * @param lcgOptions
 * @param bls
 */
function remapLcgs(
  lcgOptions: ILCGOptionsIntermediate,
  bls: IBayLevelDataStaf[]
) {
  const lpp = lcgOptions.lpp;

  const lcgSignMult =
    lcgOptions.orientationIncrease === ForeAftEnum.FWD ? 1 : -1;

  const lcgRebase =
    lcgOptions.reference === LcgReferenceEnum.FWD_PERPENDICULAR
      ? (lcg: number) => lpp - lcg * lcgSignMult
      : lcgOptions.reference === LcgReferenceEnum.MIDSHIPS
      ? (lcg: number) => lpp * 0.5 + lcg * lcgSignMult
      : (lcg: number) => lcg * lcgSignMult;

  bls.forEach((bl) => {
    const infoByContLength = bl.infoByContLength;
    const contLens = Object.keys(
      infoByContLength
    ) as unknown as TContainerLengths[];

    // remap infoByContLength
    contLens.forEach((len) => {
      let lcg = infoByContLength[len].lcg;
      if (lcg !== undefined) {
        infoByContLength[len].lcg = lcgRebase(lcg);
      }
    });

    // remap bulkheads
    const bulkhead = bl.bulkhead;
    if (bulkhead) {
      if (bulkhead.foreLcg !== undefined)
        bulkhead.foreLcg = lcgRebase(bulkhead.foreLcg);
      if (bulkhead.aftLcg !== undefined)
        bulkhead.aftLcg = lcgRebase(bulkhead.aftLcg);
    }

    // remap  perRowInfo.each.[xx].rowInfoByLength
    const perRowInfoEach = bl.perRowInfo?.each;
    if (perRowInfoEach) {
      const rows = Object.keys(perRowInfoEach) as IIsoRowPattern[];
      rows.forEach((row) => {
        const rowInfoByLength = perRowInfoEach[row].rowInfoByLength;
        if (rowInfoByLength) {
          const sizes = Object.keys(rowInfoByLength).map(
            Number
          ) as TContainerLengths[];
          sizes.forEach((size) => {
            const lcg = rowInfoByLength[size].lcg;
            if (lcg !== undefined) {
              rowInfoByLength[size].lcg = lcgRebase(lcg);
            }
          });
        }
      });
    }
  });
}
