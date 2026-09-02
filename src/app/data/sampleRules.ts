import { DEFAULT_DEFINE_RULE_ATTRIBUTES } from '../constants/ruleDefineOptions';

type BaseSampleRule = {
  id: string;
  name: string;
  status: string;
  fleetTypes: string[];
  location?: string;
  productType?: string;
  condition: string;
  action: string;
  schedule: string;
  createdDate: string;
  lastExecuted: string | null;
  executionCount: number;
  revenueImpact: string;
  scheduleCount?: number;
  scheduleNames?: string[];
};

const ALL_FLEET_TYPES = ['Compact', 'Sedan', 'SUV', 'XUV', 'Luxury', 'Sports', 'Van'];

const locationMap: Record<string, string[]> = {
  'LAS-LAS': ['BGLV1-PHX'],
  'Los Angeles': ['BGLV1-SFO'],
  Chicago: ['BGLV1-PDX'],
  Miami: ['BGLV1-PHX'],
  'San Francisco': ['BGLV1-SFO'],
  'New York': ['BGLV1-BGLV1'],
  Seattle: ['BGLV1-PDX'],
  Boston: ['BGLV1-PDX'],
  Denver: ['BGLV1-PHX'],
};

const productTypeMap: Record<string, string[]> = {
  Premium: ['Weekly Rental'],
  Economy: ['Daily Rental'],
  Standard: ['Monthly Rental'],
  Luxury: ['Subscription'],
};

const productCodeMap: Record<string, string> = {
  Premium: 'AE',
  Economy: 'AD',
  Standard: 'AF',
  Luxury: 'AG',
};

const pickupLocationMap: Record<string, string[]> = {
  'LAS-LAS': ['YLW', 'LAS', 'PHX'],
  'Los Angeles': ['LAX', 'SFO', 'SAN'],
  Chicago: ['ORD', 'MDW'],
  Miami: ['MIA', 'FLL'],
  'San Francisco': ['SFO', 'OAK', 'SJC'],
  'New York': ['JFK', 'LGA', 'EWR'],
  Seattle: ['SEA', 'BFI'],
  Boston: ['BOS', 'PVD'],
  Denver: ['DEN', 'COS'],
};

const brandByRuleId: Record<string, string> = {
  '1': 'Avis',
  '2': 'Hertz',
  '3': 'Budget',
  '4': 'Enterprise',
  '5': 'National',
  '6': 'Alamo',
  '7': 'Dollar',
  '8': 'Thrifty',
  '9': 'Sixt',
  '10': 'Avis',
  '11': 'Hertz',
  '12': 'Budget',
  '13': 'Enterprise',
  '14': 'National',
  '15': 'Alamo',
  '16': 'Dollar',
  '17': 'Thrifty',
  '18': 'Sixt',
  '19': 'Avis',
  '20': 'Hertz',
  '21': 'Avis',
  '22': 'Budget',
  '23': 'Enterprise',
  '24': 'National',
};

const defineRuleOverridesByRuleId: Record<
  string,
  {
    pickupLocation: string[];
    sameDropoff: boolean;
    dropOffLocation: string[];
    lor: string[];
    carCode: string[];
  }
> = {
  '21': {
    pickupLocation: ['YLW', 'LAS', 'SFO', 'PDX', 'PHX', 'LAX'],
    sameDropoff: true,
    dropOffLocation: ['YLW', 'LAS', 'SFO', 'PDX', 'PHX', 'LAX'],
    lor: ['1', '2'],
    carCode: ['A', 'B'],
  },
  '22': {
    pickupLocation: ['ORD', 'DEN', 'BOS'],
    sameDropoff: false,
    dropOffLocation: ['SEA', 'MIA', 'ATL', 'DFW', 'IAH', 'MCO'],
    lor: ['1', '2'],
    carCode: ['C', 'E'],
  },
  '23': {
    pickupLocation: ['LAS', 'PHX'],
    sameDropoff: true,
    dropOffLocation: ['LAS', 'PHX'],
    lor: ['1', '2', '3', '4'],
    carCode: ['A', 'B', 'C', 'E', 'F', 'G'],
  },
  '24': {
    pickupLocation: ['YLW', 'LAS', 'SFO', 'PDX', 'PHX', 'LAX', 'ORD', 'DEN', 'BOS', 'SEA', 'MIA', 'ATL'],
    sameDropoff: false,
    dropOffLocation: ['DFW', 'IAH', 'MCO', 'YLW', 'LAS', 'SFO', 'PDX', 'PHX', 'LAX', 'ORD', 'DEN', 'BOS'],
    lor: ['1', '2', '3', '4'],
    carCode: ['A', 'B', 'C', 'E', 'F', 'G', 'H', 'K', 'L', 'S', 'V', 'W'],
  },
};

const carCodeByRuleId: Record<string, string[]> = {
  '1': ['F', 'G'],
  '2': ['A', 'B'],
  '3': ['C', 'E'],
  '4': ['F', 'G', 'H'],
  '5': ['A', 'B'],
  '6': ['K', 'L'],
  '7': ['A', 'B', 'C'],
  '8': ['A', 'B', 'C', 'E'],
  '9': ['F', 'H'],
  '10': ['A', 'B', 'C'],
  '11': ['G', 'H'],
  '12': ['C', 'E'],
  '13': ['F', 'G'],
  '14': ['A'],
  '15': ['G', 'H', 'F'],
  '16': ['A', 'B', 'C'],
  '17': ['A', 'B'],
  '18': ['F', 'G', 'H'],
  '19': ['H', 'G'],
  '20': ['K', 'L', 'S'],
  '21': ['A', 'B'],
  '22': ['C', 'E'],
  '23': ['A', 'B', 'C', 'E', 'F', 'G'],
  '24': ['A', 'B', 'C', 'E', 'F', 'G', 'H', 'K', 'L', 'S', 'V', 'W'],
};

function getDefineAttributes(base: BaseSampleRule, lorValue?: string[]) {
  const override = defineRuleOverridesByRuleId[base.id];
  if (override) {
    return {
      brand: brandByRuleId[base.id] || DEFAULT_DEFINE_RULE_ATTRIBUTES.brand,
      ...override,
      productCode:
        productCodeMap[base.productType || ''] || DEFAULT_DEFINE_RULE_ATTRIBUTES.productCode,
    };
  }

  const pickupLocation =
    pickupLocationMap[base.location || ''] || DEFAULT_DEFINE_RULE_ATTRIBUTES.pickupLocation;
  const sameDropoff = !['3', '10', '15', '18'].includes(base.id);

  return {
    brand: brandByRuleId[base.id] || DEFAULT_DEFINE_RULE_ATTRIBUTES.brand,
    pickupLocation,
    sameDropoff,
    dropOffLocation: sameDropoff ? pickupLocation : pickupLocation.slice(0, 2),
    productCode:
      productCodeMap[base.productType || ''] || DEFAULT_DEFINE_RULE_ATTRIBUTES.productCode,
    lor: lorValue?.length ? lorValue : DEFAULT_DEFINE_RULE_ATTRIBUTES.lor,
    carCode: carCodeByRuleId[base.id] || DEFAULT_DEFINE_RULE_ATTRIBUTES.carCode,
  };
}

function vendorPriceDetails(overrides: Record<string, unknown> = {}) {
  return {
    currentPrice: '',
    currentPriceUnit: '$',
    byFix: 'Lower',
    min: 'Min',
    minMaxOptions: [] as string[],
    minMaxValue: '',
    minMaxValueUnit: '%',
    minMaxOperators: '',
    minMaxOperatorsUnit: '%',
    priceEndsWith: '',
    priceEndsWithUnit: '%',
    butNoInputValue: '',
    butNoCheckbox: false,
    ...overrides,
  };
}

function currentPriceDetails(overrides: Record<string, unknown> = {}) {
  return {
    currentPrice: '',
    currentPriceUnit: '$',
    byFix: 'Lower',
    min: 'Min',
    minMaxOptions: [] as string[],
    minMaxValue: '',
    minMaxValueUnit: '%',
    minMaxOperators: '',
    minMaxOperatorsUnit: '%',
    priceEndsWith: '',
    priceEndsWithUnit: '%',
    ...overrides,
  };
}

function firstConditionStandard(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    leftMinMax: 'Min',
    leftOptions: ['Hertz', 'Budget'],
    leftValue: '10',
    operator: 'Less or Equal',
    rightMinMax: 'Min',
    rightOptions: ['National', 'Alamo'],
    rightValue: '12',
    ...overrides,
  };
}

function firstConditionCompetitor(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    leftMinMax: 'Min',
    leftOptions: ['Hertz', 'Avis', 'Enterprise'],
    leftValue: '8',
    operator: 'Less or Equal',
    rightMinMax: 'Min',
    rightOptions: ['Budget', 'Dollar'],
    rightValue: '9',
    ...overrides,
  };
}

function conditionalRule(config: {
  utilizationValue?: string;
  utilizationValueEnd?: string;
  utilizationType?: string;
  daysOutValue?: string;
  daysOutValueEnd?: string;
  actions?: string[];
  selectedDays?: string[];
}) {
  const {
    utilizationValue = '60',
    utilizationValueEnd = '75',
    utilizationType = 'Actual',
    daysOutValue = '1',
    daysOutValueEnd = '7',
    actions = ['Vendor Price'],
    selectedDays = [],
  } = config;

  return {
    enabled: true,
    type: 'if',
    mainCondition: {
      type: 'Utilization',
      operator: 'Range',
      value: utilizationValue,
      valueEnd: utilizationValueEnd,
      unit: '%',
      utilizationType,
    },
    subConditions: [
      {
        connector: 'And',
        type: 'Days out',
        dateRangeType: 'daysOut',
        operator: 'Range',
        value: daysOutValue,
        valueEnd: daysOutValueEnd,
        unit: 'days',
        pickupStartDate: '',
        pickupEndDate: '',
      },
    ],
    actions,
    selectedDays,
    valueDetails: { value: '5', priceEndsWith: '9' },
    currentPriceDetails: currentPriceDetails({ currentPrice: '10', byFix: 'Lower' }),
    vendorPriceDetails: vendorPriceDetails({
      minMaxOptions: ['Hertz', 'Avis'],
      minMaxValue: '3',
      minMaxValueUnit: '%',
      currentPrice: '8',
    }),
  };
}

function elseCondition(enabled = false) {
  return {
    enabled,
    action: { type: enabled ? 'Vendor Price' : '', value: enabled ? '5' : '', valueType: 'percentage' },
  };
}

function buildScheduleData(rule: BaseSampleRule) {
  if (!rule.schedule || rule.schedule === '') {
    return undefined;
  }

  const isWeekly = /Mon|Tue|Wed|Thu|Fri|Sat|Sun/.test(rule.schedule);
  return {
    startDate: rule.createdDate,
    startTime: '09:00',
    endDate: '',
    endTime: '17:00',
    isRecurring: isWeekly,
    repeatFrequency: 'weekly',
    dailyInterval: 1,
    days: isWeekly
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].filter((day) => rule.schedule.includes(day))
      : [],
    monthlyType: 'dayOfMonth',
    monthlyDay: 1,
    monthlyInterval: 1,
    monthlyWeekOccurrence: '1st',
    monthlyWeekDay: 'Monday',
    endRepeat: 'never',
    endRepeatDate: '',
    timezone: 'EST',
    locations: locationMap[rule.location || ''] || ['All'],
    productTypes: productTypeMap[rule.productType || ''] || [],
    lors: ['1', '2', '3', '4'],
    carType: '',
    fleetTypes:
      rule.fleetTypes.includes('All Fleet Types') ? ALL_FLEET_TYPES : rule.fleetTypes,
  };
}

function buildRuleFields(
  base: BaseSampleRule,
  config: {
    firstConditions: ReturnType<typeof firstConditionStandard>[];
    conditionalRules: ReturnType<typeof conditionalRule>[];
    elseEnabled?: boolean;
    lors?: string[];
    description?: string;
  }
) {
  const fleetTypes = base.fleetTypes.includes('All Fleet Types')
    ? ALL_FLEET_TYPES
    : base.fleetTypes.filter((type) => type !== '4WD').map((type) => (type === '4WD' ? 'SUV' : type));

  const defineAttributes = getDefineAttributes(base, config.lors);

  return {
    description:
      config.description ||
      `${base.name} — ${base.condition}. Applies to ${base.location || 'all locations'}.`,
    ...defineAttributes,
    locations: defineAttributes.pickupLocation,
    productTypes: [defineAttributes.productCode],
    lors: defineAttributes.lor,
    fleetTypes: defineAttributes.carCode,
    firstConditions: config.firstConditions,
    conditionalRules: config.conditionalRules,
    elseCondition: elseCondition(config.elseEnabled),
    scheduleData: buildScheduleData(base),
  };
}

function enrichRule(base: BaseSampleRule) {
  const configs: Record<string, Parameters<typeof buildRuleFields>[1]> = {
    '1': {
      description: 'Weekend premium surge pricing for luxury and sports vehicles.',
      lors: ['1', '2', '3'],
      firstConditions: [firstConditionStandard({ leftValue: '15', rightValue: '18' })],
      conditionalRules: [
        conditionalRule({
          utilizationValue: '65',
          utilizationValueEnd: '85',
          daysOutValue: '1',
          daysOutValueEnd: '3',
          actions: ['Vendor Price'],
          selectedDays: ['Fri', 'Sat', 'Sun'],
        }),
      ],
    },
    '2': {
      description: 'Weekday economy boost for sedan and compact fleets.',
      lors: ['1', '2', '3', '4'],
      firstConditions: [firstConditionStandard({ operator: 'Greater or Equal', leftValue: '8', rightValue: '10' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Less than',
          utilizationValue: '50',
          daysOutValue: '5',
          actions: ['Vendor Price'],
          selectedDays: ['Mon', 'Tue', 'Wed', 'Thu'],
        }),
      ],
    },
    '3': {
      description: 'Competitor price matching for SUV and XUV segments.',
      lors: ['1', '2', '3'],
      firstConditions: [firstConditionCompetitor({ leftValue: '6', rightValue: '7' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Less than',
          utilizationValue: '60',
          daysOutOperator: 'Less than',
          daysOutValue: '5',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '4': {
      description: 'Holiday peak pricing for luxury vehicles in Miami.',
      lors: ['2', '3', '4'],
      firstConditions: [firstConditionStandard({ leftOptions: ['Enterprise', 'National'], rightOptions: ['Hertz', 'Avis'] })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Greater than',
          utilizationValue: '80',
          daysOutOperator: 'Greater than',
          daysOutValue: '7',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '5': {
      description: 'Early bird discount for advance economy bookings.',
      lors: ['3', '4'],
      firstConditions: [firstConditionStandard({ leftValue: '5', rightValue: '6' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Less than',
          utilizationValue: '50',
          daysOutOperator: 'Greater than',
          daysOutValue: '14',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '6': {
      description: 'Airport rush hour premium for morning pickups.',
      lors: ['1', '2', '3'],
      firstConditions: [firstConditionStandard({ leftOptions: ['Hertz', 'National'], leftValue: '12', rightValue: '14' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Greater than',
          utilizationValue: '65',
          daysOutValue: '2',
          actions: ['Vendor Price'],
          selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        }),
      ],
    },
    '7': {
      description: 'Monthly subscriber loyalty discount.',
      lors: ['4'],
      firstConditions: [firstConditionStandard({ operator: 'Less or Equal', leftValue: '7', rightValue: '8' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Less than',
          utilizationValue: '70',
          daysOutValue: '10',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '8': {
      description: 'Last minute booking surge pricing.',
      lors: ['1', '2', '3'],
      firstConditions: [firstConditionCompetitor({ leftValue: '9', rightValue: '10' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Greater than',
          utilizationValue: '50',
          daysOutOperator: 'Less than',
          daysOutValue: '1',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '9': {
      description: 'Low season weekday promotion for luxury sports.',
      lors: ['1', '2', '3', '4'],
      firstConditions: [firstConditionStandard({ leftValue: '11', rightValue: '13' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Less than',
          utilizationValue: '40',
          daysOutValue: '6',
          actions: ['Vendor Price'],
          selectedDays: ['Mon', 'Tue', 'Wed'],
        }),
      ],
    },
    '10': {
      description: 'Extended rental discount for 7+ day bookings.',
      lors: ['3', '4'],
      firstConditions: [firstConditionStandard({ leftValue: '4', rightValue: '5' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Less than',
          utilizationValue: '55',
          daysOutOperator: 'Greater than',
          daysOutValue: '3',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '11': {
      description: 'Business traveler premium on weekdays.',
      lors: ['1', '2', '3', '4'],
      firstConditions: [firstConditionStandard({ leftOptions: ['Enterprise', 'Sixt'], leftValue: '10', rightValue: '11' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Greater than',
          utilizationValue: '60',
          daysOutValue: '4',
          actions: ['Vendor Price'],
          selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        }),
      ],
    },
    '12': {
      description: 'Rainy day SUV surge based on weather demand.',
      lors: ['1', '2', '3'],
      firstConditions: [firstConditionCompetitor({ leftValue: '8', rightValue: '9' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Greater than',
          utilizationValue: '55',
          daysOutOperator: 'Less than',
          daysOutValue: '3',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '13': {
      description: 'Summer beach weekend premium for sports convertibles.',
      lors: ['1', '2', '3'],
      firstConditions: [firstConditionStandard({ leftValue: '14', rightValue: '16' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Greater than',
          utilizationValue: '70',
          daysOutValue: '2',
          actions: ['Vendor Price'],
          selectedDays: ['Sat', 'Sun'],
        }),
      ],
    },
    '14': {
      description: 'Compact commuter morning deal.',
      lors: ['1', '2', '3'],
      firstConditions: [firstConditionStandard({ leftValue: '6', rightValue: '7' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Less than',
          utilizationValue: '60',
          daysOutOperator: 'Less than',
          daysOutValue: '2',
          actions: ['Vendor Price'],
          selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        }),
      ],
    },
    '15': {
      description: 'Convention center event-based surge pricing.',
      lors: ['1', '2', '3'],
      firstConditions: [firstConditionCompetitor({ leftValue: '10', rightValue: '12' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Greater than',
          utilizationValue: '75',
          daysOutValue: '5',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '16': {
      description: 'Gold and platinum loyalty member rewards.',
      lors: ['1', '2', '3', '4'],
      firstConditions: [firstConditionStandard({ operator: 'Less or Equal', leftValue: '7', rightValue: '8' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Less than',
          utilizationValue: '65',
          daysOutValue: '8',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '17': {
      description: 'Red eye flight arrival special pricing.',
      lors: ['1', '2', '3'],
      firstConditions: [firstConditionStandard({ leftValue: '5', rightValue: '6' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Less than',
          utilizationValue: '50',
          daysOutOperator: 'Less than',
          daysOutValue: '4',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '18': {
      description: 'Sports event premium pricing draft rule.',
      lors: ['2', '3', '4'],
      firstConditions: [firstConditionCompetitor({ leftValue: '11', rightValue: '13' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Greater than',
          utilizationValue: '70',
          daysOutOperator: 'Greater than',
          daysOutValue: '5',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '19': {
      description: 'Midweek luxury promotion for Tuesday and Wednesday.',
      lors: ['1', '2', '3', '4'],
      firstConditions: [firstConditionStandard({ leftValue: '9', rightValue: '10' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Less than',
          utilizationValue: '55',
          daysOutOperator: 'Less than',
          daysOutValue: '6',
          actions: ['Vendor Price'],
          selectedDays: ['Tue', 'Wed'],
        }),
      ],
    },
    '20': {
      description: 'Winter storm adjustment for SUV and 4WD fleets.',
      lors: ['1', '2', '3'],
      firstConditions: [firstConditionCompetitor({ leftValue: '10', rightValue: '11' })],
      conditionalRules: [
        conditionalRule({
          utilizationOperator: 'Greater than',
          utilizationValue: '60',
          daysOutOperator: 'Less than',
          daysOutValue: '3',
          actions: ['Vendor Price'],
        }),
      ],
    },
    '21': {
      description: 'Demo rule — hover pickup locations to see 6 values (shows first 3 + ellipsis).',
      lors: ['1', '2'],
      firstConditions: [firstConditionStandard({ leftValue: '10', rightValue: '12' })],
      conditionalRules: [conditionalRule({ utilizationValue: '60', utilizationValueEnd: '70' })],
    },
    '22': {
      description: 'Demo rule — hover drop-off locations to see 6 values (pickup has only 3, no tooltip).',
      lors: ['1', '2'],
      firstConditions: [firstConditionStandard({ leftValue: '9', rightValue: '11' })],
      conditionalRules: [conditionalRule({ utilizationValue: '55', utilizationValueEnd: '65' })],
    },
    '23': {
      description: 'Demo rule — hover LOR and car code columns for multi-value tooltips.',
      lors: ['1', '2', '3', '4'],
      firstConditions: [firstConditionStandard({ leftValue: '8', rightValue: '10' })],
      conditionalRules: [conditionalRule({ utilizationValue: '50', utilizationValueEnd: '60' })],
    },
    '24': {
      description: 'Demo rule — hover any column with 12 values to see a scrollable tooltip.',
      lors: ['1', '2', '3', '4'],
      firstConditions: [firstConditionStandard({ leftValue: '11', rightValue: '13' })],
      conditionalRules: [conditionalRule({ utilizationValue: '65', utilizationValueEnd: '75' })],
    },
  };

  const fieldConfig = configs[base.id];
  if (!fieldConfig) {
    return {
      ...base,
      description: base.name,
      locations: ['All'],
      productTypes: ['Daily Rental'],
      lors: ['1', '2', '3', '4'],
      fleetTypes: base.fleetTypes,
      firstConditions: [firstConditionStandard()],
      conditionalRules: [conditionalRule({})],
      elseCondition: elseCondition(),
    };
  }

  const fields = buildRuleFields(base, fieldConfig);
  return {
    ...base,
    ...fields,
    fleetTypes: fields.fleetTypes,
  };
}

const baseSampleRules: BaseSampleRule[] = [
  {
    id: '21',
    name: 'Airport Pickup Premium Rate',
    status: 'active',
    fleetTypes: ['Sedan', 'SUV'],
    location: 'LAS-LAS',
    productType: 'Premium',
    condition: 'Demo — pickup column shows 6 locations',
    action: 'Hover pickup to see full list',
    schedule: 'Always Active',
    createdDate: '2026-07-08',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 0,
  },
  {
    id: '22',
    name: 'One-Way Drop-off Surcharge',
    status: 'active',
    fleetTypes: ['Sedan', 'Compact'],
    location: 'Chicago',
    productType: 'Economy',
    condition: 'Demo — drop-off column shows 6 locations',
    action: 'Hover drop-off to see full list',
    schedule: 'Always Active',
    createdDate: '2026-07-09',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 0,
  },
  {
    id: '23',
    name: 'Extended LOR Car Class Pricing',
    status: 'active',
    fleetTypes: ['SUV', 'Luxury'],
    location: 'Miami',
    productType: 'Standard',
    condition: 'Demo — LOR and car code columns',
    action: 'Hover LOR (4 values) and car code (6 values)',
    schedule: 'Always Active',
    createdDate: '2026-07-10',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 0,
  },
  {
    id: '24',
    name: 'Multi-Location Fleet Adjustment',
    status: 'active',
    fleetTypes: ['All Fleet Types'],
    location: 'Denver',
    productType: 'Premium',
    condition: 'Demo — 12 values per column with scroll',
    action: 'Hover pickup, drop-off, or car code for scrollable tooltip',
    schedule: 'Always Active',
    createdDate: '2026-07-11',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 0,
  },
  {
    id: '1',
    name: 'Weekend Premium Surge',
    status: 'scheduled',
    fleetTypes: ['Luxury', 'Sports'],
    location: 'LAS-LAS',
    productType: 'Premium',
    condition: 'If Weekend days',
    action: 'If Utilization > 70% Then Current Price',
    schedule: 'Fri, Sat, Sun 18:00 - 23:00',
    createdDate: '2025-10-15',
    lastExecuted: '2025-11-08',
    executionCount: 24,
    revenueImpact: '+$12,450',
    scheduleCount: 3,
    scheduleNames: ['Weekend Premium Pricing', 'Friday Night Special', 'Luxury Weekend Surge'],
  },
  {
    id: '2',
    name: 'Weekday Economy Boost',
    status: 'scheduled',
    fleetTypes: ['Sedan', 'Compact'],
    location: 'Los Angeles',
    productType: 'Economy',
    condition: 'If Weekday',
    action: 'If Utilization < 50% Then Value',
    schedule: 'Mon, Tue, Wed, Thu 09:00 - 17:00',
    createdDate: '2025-10-20',
    lastExecuted: '2025-11-07',
    executionCount: 18,
    revenueImpact: '+$8,200',
    scheduleCount: 7,
    scheduleNames: ['Weekday Discount', 'Monday Morning Deal', 'Tuesday Boost', 'Wednesday Value', 'Thursday Special', 'Midweek Saver', 'Business Week Pricing'],
  },
  {
    id: '3',
    name: 'Competitor Match - SUV',
    status: 'scheduled',
    fleetTypes: ['SUV', 'XUV'],
    location: 'Chicago',
    productType: 'Standard',
    condition: 'If Competitor price < Our price',
    action: 'If Utilization Less than 60% And Days out Less than 5 day Then Current Price',
    schedule: 'Mon, Tue, Wed, Thu, Fri, Sat, Sun 06:00 - 06:00',
    createdDate: '2025-11-01',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 2,
    scheduleNames: ['Mag 7 Match', 'Competitor Price Sync'],
  },
  {
    id: '4',
    name: 'Holiday Peak Pricing',
    status: 'draft',
    fleetTypes: ['All Fleet Types'],
    location: 'Miami',
    productType: 'Luxury',
    condition: 'If Major holidays',
    action: 'If Utilization > 80% And Days out Greater than 7 day Then Current Price',
    schedule: 'Specific dates only',
    createdDate: '2025-09-10',
    lastExecuted: '2025-10-31',
    executionCount: 5,
    revenueImpact: '+$18,900',
    scheduleCount: 0,
  },
  {
    id: '5',
    name: 'Early Bird Discount',
    status: 'draft',
    fleetTypes: ['Compact', 'Sedan'],
    location: 'San Francisco',
    productType: 'Economy',
    condition: 'If Booking made',
    action: 'If Utilization Less than 50% And Days out Greater than 14 day Then Value',
    schedule: '',
    createdDate: '2025-11-09',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 0,
  },
  {
    id: '6',
    name: 'Airport Rush Hour Premium',
    status: 'scheduled',
    fleetTypes: ['Sedan', 'SUV'],
    location: 'New York',
    productType: 'Premium',
    condition: 'If Airport location And Pickup time 06:00-10:00',
    action: 'If Utilization Greater than 65% Then Current Price',
    schedule: 'Mon, Tue, Wed, Thu, Fri 06:00 - 10:00',
    createdDate: '2025-10-05',
    lastExecuted: '2025-11-09',
    executionCount: 45,
    revenueImpact: '+$15,800',
    scheduleCount: 4,
    scheduleNames: ['Morning Rush', 'Evening Peak', 'Airport Premium Hours', 'JFK Rush Pricing'],
  },
  {
    id: '7',
    name: 'Monthly Subscriber Discount',
    status: 'scheduled',
    fleetTypes: ['Compact', 'Sedan', 'SUV'],
    location: 'LAS-LAS',
    productType: 'Standard',
    condition: 'If Customer type = Subscriber',
    action: 'If Utilization Less than 70% Then Value',
    schedule: 'Always Active',
    createdDate: '2025-09-25',
    lastExecuted: '2025-11-09',
    executionCount: 156,
    revenueImpact: '+$22,300',
    scheduleCount: 1,
    scheduleNames: ['Monthly Subscriber Deal'],
  },
  {
    id: '8',
    name: 'Last Minute Booking Surge',
    status: 'scheduled',
    fleetTypes: ['All Fleet Types'],
    location: 'Los Angeles',
    productType: 'Premium',
    condition: 'If Last minute booking',
    action: 'If Utilization Greater than 50% And Days out Less than 1 day Then Current Price',
    schedule: 'Always Active',
    createdDate: '2025-10-12',
    lastExecuted: '2025-11-08',
    executionCount: 89,
    revenueImpact: '+$28,500',
    scheduleCount: 1,
    scheduleNames: ['Same Day Surge Pricing'],
  },
  {
    id: '9',
    name: 'Low Season Promotion',
    status: 'scheduled',
    fleetTypes: ['Luxury', 'Sports'],
    location: 'Miami',
    productType: 'Luxury',
    condition: 'If Season = Low And Weekday',
    action: 'If Utilization Less than 40% Then Value',
    schedule: 'Mon, Tue, Wed 10:00 - 16:00',
    createdDate: '2025-11-02',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 2,
    scheduleNames: ['Off Season Deal', 'Winter Weekday Special'],
  },
  {
    id: '10',
    name: 'Extended Rental Discount',
    status: 'draft',
    fleetTypes: ['All Fleet Types'],
    location: 'Chicago',
    productType: 'Economy',
    condition: 'If Length of rental > 7 days',
    action: 'If Utilization Less than 55% And Days out Greater than 3 day Then Value',
    schedule: '',
    createdDate: '2025-11-08',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 0,
  },
  {
    id: '11',
    name: 'Business Traveler Premium',
    status: 'scheduled',
    fleetTypes: ['Sedan', 'Luxury'],
    location: 'San Francisco',
    productType: 'Premium',
    condition: 'If Customer type = Business And Weekday',
    action: 'If Utilization Greater than 60% Then Current Price',
    schedule: 'Mon, Tue, Wed, Thu, Fri 08:00 - 18:00',
    createdDate: '2025-10-18',
    lastExecuted: '2025-11-09',
    executionCount: 67,
    revenueImpact: '+$19,200',
    scheduleCount: 1,
    scheduleNames: ['Corporate Travel Pricing'],
  },
  {
    id: '12',
    name: 'Rainy Day SUV Surge',
    status: 'scheduled',
    fleetTypes: ['SUV', 'XUV'],
    location: 'Seattle',
    productType: 'Standard',
    condition: 'If Weather = Rain Or Storm',
    action: 'If Utilization Greater than 55% And Days out Less than 3 day Then Current Price',
    schedule: 'Always Active',
    createdDate: '2025-09-15',
    lastExecuted: '2025-11-08',
    executionCount: 112,
    revenueImpact: '+$24,600',
    scheduleCount: 1,
    scheduleNames: ['Weather-Based SUV Premium'],
  },
  {
    id: '13',
    name: 'Summer Beach Weekend',
    status: 'scheduled',
    fleetTypes: ['Sports', 'Convertible'],
    location: 'Miami',
    productType: 'Luxury',
    condition: 'If Season = Summer And Weekend',
    action: 'If Utilization Greater than 70% Then Current Price',
    schedule: 'Sat, Sun 00:00 - 23:59',
    createdDate: '2025-11-05',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 2,
    scheduleNames: ['Saturday Beach Rush', 'Sunday Coastal Premium'],
  },
  {
    id: '14',
    name: 'Compact Commuter Deal',
    status: 'scheduled',
    fleetTypes: ['Compact'],
    location: 'Boston',
    productType: 'Economy',
    condition: 'If Weekday morning hours',
    action: 'If Utilization Less than 60% And Days out Less than 2 day Then Value',
    schedule: 'Mon, Tue, Wed, Thu, Fri 06:00 - 09:00',
    createdDate: '2025-10-22',
    lastExecuted: '2025-11-09',
    executionCount: 34,
    revenueImpact: '+$6,800',
    scheduleCount: 1,
    scheduleNames: ['Morning Commute Special'],
  },
  {
    id: '15',
    name: 'Convention Center Surge',
    status: 'draft',
    fleetTypes: ['Sedan', 'SUV', 'Luxury'],
    location: 'LAS-LAS',
    productType: 'Premium',
    condition: 'If Major event at convention center',
    action: 'If Utilization Greater than 75% Then Current Price',
    schedule: 'Event-based',
    createdDate: '2025-09-28',
    lastExecuted: '2025-10-25',
    executionCount: 8,
    revenueImpact: '+$31,400',
    scheduleCount: 0,
  },
  {
    id: '16',
    name: 'Loyalty Member Reward',
    status: 'scheduled',
    fleetTypes: ['All Fleet Types'],
    location: 'New York',
    productType: 'Standard',
    condition: 'If Customer loyalty tier = Gold Or Platinum',
    action: 'If Utilization Less than 65% Then Value',
    schedule: 'Always Active',
    createdDate: '2025-09-01',
    lastExecuted: '2025-11-09',
    executionCount: 203,
    revenueImpact: '+$35,700',
    scheduleCount: 1,
    scheduleNames: ['Premium Member Benefits'],
  },
  {
    id: '17',
    name: 'Red Eye Flight Special',
    status: 'scheduled',
    fleetTypes: ['Sedan', 'Compact'],
    location: 'Los Angeles',
    productType: 'Standard',
    condition: 'If Pickup time between 00:00-05:00',
    action: 'If Utilization Less than 50% And Days out Less than 4 day Then Value',
    schedule: 'Mon, Tue, Wed, Thu, Fri, Sat, Sun 00:00 - 05:00',
    createdDate: '2025-11-03',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 2,
    scheduleNames: ['Late Night Arrival Deal', 'Early Morning Special'],
  },
  {
    id: '18',
    name: 'Sports Event Premium',
    status: 'draft',
    fleetTypes: ['All Fleet Types'],
    location: 'Chicago',
    productType: 'Premium',
    condition: 'If Major sports event scheduled',
    action: 'If Utilization Greater than 70% And Days out Greater than 5 day Then Current Price',
    schedule: '',
    createdDate: '2025-11-07',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 0,
  },
  {
    id: '19',
    name: 'Midweek Luxury Promotion',
    status: 'scheduled',
    fleetTypes: ['Luxury', 'Sports'],
    location: 'San Francisco',
    productType: 'Luxury',
    condition: 'If Tuesday Or Wednesday',
    action: 'If Utilization Less than 55% And Days out Less than 6 day Then Value',
    schedule: 'Tue, Wed 10:00 - 20:00',
    createdDate: '2025-10-14',
    lastExecuted: '2025-11-06',
    executionCount: 28,
    revenueImpact: '+$11,300',
    scheduleCount: 1,
    scheduleNames: ['Midweek Luxury Deal'],
  },
  {
    id: '20',
    name: 'Winter Storm Adjustment',
    status: 'scheduled',
    fleetTypes: ['SUV', 'XUV', '4WD'],
    location: 'Denver',
    productType: 'Standard',
    condition: 'If Weather = Snow Or Ice And Temperature < 32°F',
    action: 'If Utilization Greater than 60% And Days out Less than 3 day Then Current Price',
    schedule: 'Always Active (Seasonal)',
    createdDate: '2025-11-01',
    lastExecuted: null,
    executionCount: 0,
    revenueImpact: '$0',
    scheduleCount: 1,
    scheduleNames: ['Winter Weather Pricing'],
  },
];

export const sampleRules = baseSampleRules.map(enrichRule);
