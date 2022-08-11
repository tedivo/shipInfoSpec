import IBayLevelData, {
  IBayLevelDataStaf,
} from "../../../models/v1/parts/IBayLevelData";
import {
  safeNumberGramsToTons,
  safeNumberMmToMt,
} from "../../../helpers/safeNumberConversions";

import ISectionMapToStafConfig from "../../types/ISectionMapToStafConfig";
import { getBayLevelEnumValueToStaf } from "../../../models/base/enums/BayLevelEnum";
import { getForeAftEnumToStaf } from "../../../models/base/enums/ForeAftEnum";
import { pad2 } from "../../../helpers/pad";
import { yNToStaf } from "../../../helpers/yNToBoolean";

/**
 * FROM OVS TO STAF
 * DEFINITION of main Bay
 */
const BayLevelConfig: ISectionMapToStafConfig<
  IBayLevelDataStaf,
  IBayLevelData
> = {
  stafSection: "SECTION",
  mapVars: [
    { stafVar: "STAF BAY", source: "isoBay", mapper: pad2 },
    { stafVar: "LEVEL", source: "level", mapper: getBayLevelEnumValueToStaf },
    {
      stafVar: "20 NAME",
      source: "label20",
      passValue: true,
    },
    {
      stafVar: "40 NAME",
      source: "label40",
      passValue: true,
    },
    {
      stafVar: "SL Hatch",
      fixedValue: "-",
    },
    {
      stafVar: "SL ForeAft",
      fixedValue: "-",
    },
    {
      stafVar: "LCG 20",
      source: "infoByContLength.20.lcg",
      mapper: safeNumberMmToMt,
    },
    {
      stafVar: "LCG 40",
      source: "infoByContLength.40.lcg",
      mapper: safeNumberMmToMt,
    },
    {
      stafVar: "LCG 45",
      source: "infoByContLength.45.lcg",
      mapper: safeNumberMmToMt,
    },
    {
      stafVar: "LCG 48",
      source: "infoByContLength.48.lcg",
      mapper: safeNumberMmToMt,
    },
    {
      stafVar: "STACK WT 20",
      source: "infoByContLength.20.stackWeight",
      mapper: safeNumberGramsToTons,
    },
    {
      stafVar: "STACK WT 40",
      source: "infoByContLength.40.stackWeight",
      mapper: safeNumberGramsToTons,
    },
    {
      stafVar: "STACK WT 45",
      source: "infoByContLength.45.stackWeight",
      mapper: safeNumberGramsToTons,
    },
    {
      stafVar: "STACK WT 48",
      source: "infoByContLength.48.stackWeight",
      mapper: safeNumberGramsToTons,
    },
    {
      stafVar: "MAX HEIGHT",
      source: "perStackInfo.common.maxHeight",
      mapper: safeNumberMmToMt,
    },
    {
      stafVar: "PAIRED BAY",
      source: "pairedBay",
      mapper: getForeAftEnumToStaf,
    },
    {
      stafVar: "REEFER PLUGS",
      fixedValue: "-",
    },
    { stafVar: "DOORS", source: "doors", mapper: getForeAftEnumToStaf },
    { stafVar: "ATHWARTSHIPS", source: "athwartShip", mapper: yNToStaf },
    { stafVar: "BULKHEAD", source: "bulkhead.fore", mapper: yNToStaf },
    {
      stafVar: "BULKHEAD LCG",
      source: "bulkhead.foreLcg",
      mapper: safeNumberMmToMt,
    },
    {
      stafVar: "LCG 24",
      source: "infoByContLength.24.lcg",
      mapper: safeNumberMmToMt,
    },
    {
      stafVar: "STACK WT 24",
      source: "infoByContLength.24.stackWeight",
      mapper: safeNumberGramsToTons,
    },
  ],
  postProcessors: [],
};

export default BayLevelConfig;
