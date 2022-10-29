import ValuesSourceEnum, {
  ValuesSourceRowTierEnum,
} from "../models/base/enums/ValuesSourceEnum";
import {
  calculateMasterCGs,
  cleanRepeatedTcgs,
} from "./core/calculateMasterCGs";
import mapStafSections, { STAF_MIN_SECTIONS } from "./core/mapStafSections";

import IOpenShipSpecV1 from "../models/v1/IOpenShipSpecV1";
import IRowStafData from "./types/IRowStafData";
import IShipData from "../models/v1/parts/IShipData";
import IStafDataProcessed from "./types/IStafDataProcessed";
import ITierStafData from "./types/ITierStafData";
import addPerRowInfo from "../converter/core/addPerRowInfo";
import addPerSlotData from "../converter/core/addPerSlotData";
import addPerTierInfo from "../converter/core/addPerTierInfo";
import calculateCommonRowInfo from "./core/calculateCommonRowInfo";
import { cgsRemap } from "./core/cgsRemap";
import { cleanBayLevelDataNoStaf } from "./core/cleanBayLevelDataNoStaf";
import { cleanUpOVSJson } from "./core/cleanup/cleanUpOVSJson";
import { createDictionaryMultiple } from "../helpers/createDictionary";
import createSummary from "./core/createSummary";
import { getContainerLengths } from "./core/getContainerLengths";
import getSectionsFromFileContent from "./core/getSectionsFromFileContent";
import { processAllSections } from "./sections/stafToOvs/processAllSections";
import substractLabels from "./core/substractLabels";
import transformLids from "./core/transformLids";

export default function stafToOvsV1Converter(
  fileContent: string,
  lpp: number,
  vgcHeightFactor = 0.45
): IOpenShipSpecV1 {
  const sectionsByName = mapStafSections(
    getSectionsFromFileContent(fileContent)
  );

  // Check minimum data
  const sectionsFound = Object.keys(sectionsByName);
  const compliesWithStaf = STAF_MIN_SECTIONS.every(
    (sectionName) => sectionsFound.indexOf(sectionName) >= 0
  );

  if (!compliesWithStaf) {
    throw {
      code: "NotStafFile",
      message: "This file doesn't seem to be a valid STAF file",
    };
  }

  // 0. Process data
  const dataProcessed: IStafDataProcessed = processAllSections(sectionsByName);
  dataProcessed.shipData.lcgOptions.lpp = lpp;
  dataProcessed.shipData.vcgOptions.heightFactor = vgcHeightFactor;

  // 1. Create dictionaries
  const rowDataByBayLevel = createDictionaryMultiple<IRowStafData, string>(
      dataProcessed.rowData,
      (d) => `${d.isoBay}-${d.level}`
    ),
    tierDataByBayLevel = createDictionaryMultiple<ITierStafData, string>(
      dataProcessed.tierData,
      (d) => `${d.isoBay}-${d.level}`
    );

  // 2. Add rows info to BayLevel.perRowInfo and get bays number
  const isoBays = addPerRowInfo(dataProcessed.bayLevelData, rowDataByBayLevel);

  // 3. Add tiers info to BayLevel.perTierInfo. Temporary, it will be deleted later
  addPerTierInfo(dataProcessed.bayLevelData, tierDataByBayLevel);

  // Pre-calculate the minAboveTier
  const preSizeSummary = createSummary({
    isoBays,
    bayLevelData: dataProcessed.bayLevelData,
  });

  // 4. Add slotsData to BayLevel.perSlotInfo
  addPerSlotData(
    dataProcessed.bayLevelData,
    dataProcessed.slotData,
    Number(preSizeSummary.minAboveTier)
  );

  // 5. Create labels dictionaries
  const positionLabels = substractLabels(dataProcessed.bayLevelData);

  // 6. Container Lenghts in Vessel
  const { lcgOptions, vcgOptions, tcgOptions, ...shipDataWithoutCgsOptions } =
    dataProcessed.shipData;

  // 7. Create Final shipData
  const shipData: IShipData = {
    ...shipDataWithoutCgsOptions,
    lcgOptions: {
      values: lcgOptions.values,
      lpp: lcgOptions.lpp,
    },
    tcgOptions: {
      values: tcgOptions.values,
    },
    vcgOptions: {
      values:
        vcgOptions.values !== ValuesSourceRowTierEnum.ESTIMATED
          ? ValuesSourceEnum.KNOWN
          : ValuesSourceEnum.ESTIMATED,
      heightFactor: vcgOptions.heightFactor,
    },
    containersLengths: getContainerLengths(dataProcessed.bayLevelData),
    masterCGs: { aboveTcgs: {}, belowTcgs: {}, bottomBases: {} },
  };

  // 8. Size Summary
  const sizeSummary = createSummary({
    isoBays,
    bayLevelData: dataProcessed.bayLevelData,
  });

  // 9. Change LCG, TCG & VCG references. Deletes perTierInfo
  cgsRemap(
    dataProcessed.bayLevelData,
    dataProcessed.shipData.lcgOptions,
    dataProcessed.shipData.vcgOptions,
    dataProcessed.shipData.tcgOptions
  );

  // 10. Add `commonRowInfo` to each bay
  calculateCommonRowInfo(dataProcessed.bayLevelData);

  // 11. Obtain most repeated CGs in masterCGs
  shipData.masterCGs = calculateMasterCGs(
    dataProcessed.shipData,
    dataProcessed.bayLevelData
  );

  // 12. cleanRepeatedTcgs
  cleanRepeatedTcgs(shipData.masterCGs, dataProcessed.bayLevelData);

  // OpenShipSpec JSON
  const result: IOpenShipSpecV1 = {
    schema: "OpenVesselSpec",
    version: "1.0.0",
    sizeSummary,
    shipData: shipData,
    baysData: cleanBayLevelDataNoStaf(dataProcessed.bayLevelData),
    positionLabels,
    lidData: transformLids(dataProcessed.lidData),
  };

  // Final Clean-Up
  cleanUpOVSJson(result);

  return result;
}
