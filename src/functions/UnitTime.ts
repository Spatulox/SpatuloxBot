class UnitTime {
  constructor(private readonly val: number) {}

  toMilliseconds(): number { return this.val }
  toSeconds(): number { return this.val / 1000 }
  toMinutes(): number { return this.val / (60 * 1000) }
  toHours(): number { return this.val / (60 * 60 * 1000) }
  toDays(): number { return this.val / (24 * 60 * 60 * 1000) }

  toString(): string { return this.val.toString() }
  valueOf(): number { return this.val }
  value(): number { return this.val }
}

const Milliseconds = {
  MS_100: new UnitTime(100),
  MS_200: new UnitTime(200),
  MS_500: new UnitTime(500),
  MS_800: new UnitTime(800),
  MS_1000: new UnitTime(1000),
}

const Seconds = {
  SEC_01: new UnitTime(1000),SEC_02: new UnitTime(2000),SEC_03: new UnitTime(3000),SEC_04: new UnitTime(4000),SEC_05: new UnitTime(5000),
  SEC_06: new UnitTime(6000),SEC_07: new UnitTime(7000),SEC_08: new UnitTime(8000),SEC_09: new UnitTime(9000),SEC_10: new UnitTime(10000),
  SEC_11: new UnitTime(11000),SEC_12: new UnitTime(12000),SEC_13: new UnitTime(13000),SEC_14: new UnitTime(14000),SEC_15: new UnitTime(15000),
  SEC_16: new UnitTime(16000),SEC_17: new UnitTime(17000),SEC_18: new UnitTime(18000),SEC_19: new UnitTime(19000),SEC_20: new UnitTime(20000),
  SEC_21: new UnitTime(21000),SEC_22: new UnitTime(22000),SEC_23: new UnitTime(23000),SEC_24: new UnitTime(24000),SEC_25: new UnitTime(25000),
  SEC_26: new UnitTime(26000),SEC_27: new UnitTime(27000),SEC_28: new UnitTime(28000),SEC_29: new UnitTime(29000),SEC_30: new UnitTime(30000),
  SEC_31: new UnitTime(31000),SEC_32: new UnitTime(32000),SEC_33: new UnitTime(33000),SEC_34: new UnitTime(34000),SEC_35: new UnitTime(35000),
  SEC_36: new UnitTime(36000),SEC_37: new UnitTime(37000),SEC_38: new UnitTime(38000),SEC_39: new UnitTime(39000),SEC_40: new UnitTime(40000),
  SEC_41: new UnitTime(41000),SEC_42: new UnitTime(42000),SEC_43: new UnitTime(43000),SEC_44: new UnitTime(44000),SEC_45: new UnitTime(45000),
  SEC_46: new UnitTime(46000), SEC_47: new UnitTime(47000), SEC_48: new UnitTime(48000), SEC_49: new UnitTime(49000), SEC_50: new UnitTime(50000),
  SEC_51: new UnitTime(51000), SEC_52: new UnitTime(52000), SEC_53: new UnitTime(53000), SEC_54: new UnitTime(54000), SEC_55: new UnitTime(55000),
  SEC_56: new UnitTime(56000), SEC_57: new UnitTime(57000), SEC_58: new UnitTime(58000), SEC_59: new UnitTime(59000), SEC_60: new UnitTime(60000),
};


const Minutes = {
  MIN_01: new UnitTime(60000),MIN_02: new UnitTime(120000),MIN_03: new UnitTime(180000),MIN_04: new UnitTime(240000),MIN_05: new UnitTime(300000),
  MIN_06: new UnitTime(360000),MIN_07: new UnitTime(420000),MIN_08: new UnitTime(480000),MIN_09: new UnitTime(540000),MIN_10: new UnitTime(600000),
  MIN_11: new UnitTime(660000),MIN_12: new UnitTime(720000),MIN_13: new UnitTime(780000),MIN_14: new UnitTime(840000),MIN_15: new UnitTime(900000),
  MIN_16: new UnitTime(960000),MIN_17: new UnitTime(1020000),MIN_18: new UnitTime(1080000),MIN_19: new UnitTime(1140000),MIN_20: new UnitTime(1200000),
  MIN_21: new UnitTime(1260000),MIN_22: new UnitTime(1320000),MIN_23: new UnitTime(1380000),MIN_24: new UnitTime(1440000),MIN_25: new UnitTime(1500000),
  MIN_26: new UnitTime(1560000),MIN_27: new UnitTime(1620000),MIN_28: new UnitTime(1680000),MIN_29: new UnitTime(1740000),MIN_30: new UnitTime(1800000),
  MIN_31: new UnitTime(1860000),MIN_32: new UnitTime(1920000),MIN_33: new UnitTime(1980000),MIN_34: new UnitTime(2040000),MIN_35: new UnitTime(2100000),
  MIN_36: new UnitTime(2160000),MIN_37: new UnitTime(2220000),MIN_38: new UnitTime(2280000),MIN_39: new UnitTime(2340000),MIN_40: new UnitTime(2400000),
  MIN_41: new UnitTime(2460000),MIN_42: new UnitTime(2520000),MIN_43: new UnitTime(2580000),MIN_44: new UnitTime(2640000),MIN_45: new UnitTime(2700000),
  MIN_46: new UnitTime(2760000),MIN_47: new UnitTime(2820000),MIN_48: new UnitTime(2880000),MIN_49: new UnitTime(2940000),MIN_50: new UnitTime(3000000),
  MIN_51: new UnitTime(3060000),MIN_52: new UnitTime(3120000),MIN_53: new UnitTime(3180000),MIN_54: new UnitTime(3240000),MIN_55: new UnitTime(3300000),
  MIN_56: new UnitTime(3360000),MIN_57: new UnitTime(3420000),MIN_58: new UnitTime(3480000),MIN_59: new UnitTime(3540000),MIN_60: new UnitTime(3600000),
};


const Hours = {
  HOUR_01: new UnitTime(3600000),HOUR_02: new UnitTime(7200000),HOUR_03: new UnitTime(10800000),HOUR_04: new UnitTime(14400000),
  HOUR_05: new UnitTime(18000000),HOUR_06: new UnitTime(21600000),HOUR_07: new UnitTime(25200000),HOUR_08: new UnitTime(28800000),
  HOUR_09: new UnitTime(32400000),HOUR_10: new UnitTime(36000000),HOUR_11: new UnitTime(39600000),HOUR_12: new UnitTime(43200000),
  HOUR_13: new UnitTime(46800000),HOUR_14: new UnitTime(50400000),HOUR_15: new UnitTime(54000000),HOUR_16: new UnitTime(57600000),
  HOUR_17: new UnitTime(61200000),HOUR_18: new UnitTime(64800000),HOUR_19: new UnitTime(68400000),HOUR_20: new UnitTime(72000000),
  HOUR_21: new UnitTime(75600000),HOUR_22: new UnitTime(79200000),HOUR_23: new UnitTime(82800000),HOUR_24: new UnitTime(86400000),
};

const Days = {
  DAY_01: new UnitTime(86400000),
  DAY_02: new UnitTime(172800000),
  DAY_03: new UnitTime(259200000),
  DAY_04: new UnitTime(345600000),
  DAY_05: new UnitTime(432000000),
  DAY_06: new UnitTime(518400000),
  DAY_07: new UnitTime(604800000),
  DAY_08: new UnitTime(691200000),
  DAY_09: new UnitTime(777600000),
  DAY_10: new UnitTime(864000000),
};



export const Time = {
  milisecond: Milliseconds,
  second: Seconds,
  minute: Minutes,
  hour: Hours,
  day: Days
}