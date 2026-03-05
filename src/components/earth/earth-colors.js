/* ==============================
 * Polygon / Earth 공통 색상 정의
 * ============================== */

export const RGBA_RANGES = {
  WS: [
    { min: 0.0, max: 1.0, color: 'rgba(50, 136, 189, 1)' },
    { min: 1.0, max: 2.0, color: 'rgba(86, 170, 178, 1)' },
    { min: 2.0, max: 3.0, color: 'rgba(121, 200, 164, 1)' },
    { min: 3.0, max: 4.0, color: 'rgba(171, 221, 164, 1)' },
    { min: 4.0, max: 5.0, color: 'rgba(230, 245, 152, 1)' },
    { min: 5.0, max: 6.0, color: 'rgba(254, 224, 139, 1)' },
    { min: 6.0, max: 7.0, color: 'rgba(253, 174, 97, 1)' },
    { min: 7.0, max: 8.0, color: 'rgba(244, 109, 67, 1)' },
    { min: 8.0, max: 9.0, color: 'rgba(220, 80, 60, 1)' },
    { min: 9.0, max: Infinity, color: 'rgba(213, 62, 79, 1)' },
  ],
  CAI: [
    { min: 0, max: 51, color: 'rgba(92, 140, 221, 1)' },
    { min: 51, max: 101, color: 'rgba(101, 178, 75, 1)' },
    { min: 101, max: 251, color: 'rgba(226, 208, 88, 1)' },
    { min: 251, max: 500, color: 'rgba(236, 122, 122, 1)' },
  ],
  TEMP: [
    // { min: -80.15, max: -67.15, color: 'rgba(37, 4, 42, 1)' },
    // { min: -67.15, max: -54.15, color: 'rgba(41, 10, 130, 1)' },
    // { min: -54.15, max: -40.0, color: 'rgba(81, 40, 40, 1)' },
    // { min: -40.0, max: -17.78, color: 'rgba(192, 37, 149, 1)' },
    // { min: -17.78, max: 0.0, color: 'rgba(70, 215, 215, 1)' },
    // { min: 0.0, max: 2.0, color: 'rgba(21, 84, 187, 1)' },
    // { min: 2.0, max: 17.85, color: 'rgba(24, 132, 14, 1)' },
    // { min: 17.85, max: 24.85, color: 'rgba(247, 251, 59, 1)' },
    // { min: 24.85, max: 37.85, color: 'rgba(235, 167, 21, 1)' },
    // { min: 37.85, max: 54.85, color: 'rgba(230, 71, 39, 1)' },
    // { min: 54.85, max: Infinity, color: 'rgba(88, 27, 67, 1)' },
    // { min: 0, max: 4, color: 'rgba(49, 0, 82, 1)' }, // 아주 진한 보라
    // { min: 4, max: 8, color: 'rgba(76, 0, 153, 1)' }, // 보라
    // { min: 8, max: 12, color: 'rgba(0, 0, 204, 1)' }, // 파랑
    // { min: 12, max: 16, color: 'rgba(0, 102, 204, 1)' }, // 파랑-청록
    // { min: 16, max: 20, color: 'rgba(0, 180, 180, 1)' }, // 청록 (중간)
    // { min: 20, max: 24, color: 'rgba(255, 200, 0, 1)' }, // 노랑 (확 튐)
    // { min: 24, max: 28, color: 'rgba(255, 140, 0, 1)' }, // 주황
    // { min: 28, max: 32, color: 'rgba(255, 80, 0, 1)' }, // 진한 주황
    // { min: 32, max: 36, color: 'rgba(220, 0, 0, 1)' }, // 빨강
    // { min: 36, max: 40, color: 'rgba(120, 0, 0, 1)' }, // 암적색
    // { min: 40, max: Infinity, color: 'rgba(50, 0, 0, 1)' },
    { min: -Infinity, max: -16, color: 'rgba(32, 0, 64, 1)' }, // 매우 진한 보라
    { min: -16, max: -12, color: 'rgba(49, 0, 82, 1)' }, // 아주 진한 보라
    { min: -12, max: -8, color: 'rgba(76, 0, 153, 1)' }, // 보라
    { min: -8, max: -4, color: 'rgba(0, 0, 204, 1)' }, // 파랑
    { min: -4, max: 0, color: 'rgba(0, 102, 204, 1)' }, // 파랑-청록
    { min: 0, max: 4, color: 'rgba(0, 180, 180, 1)' }, // 청록
    { min: 4, max: 8, color: 'rgba(120, 210, 80, 1)' }, // 연두 (완충)
    { min: 8, max: 12, color: 'rgba(255, 200, 0, 1)' }, // 노랑
    { min: 12, max: 16, color: 'rgba(255, 140, 0, 1)' }, // 주황
    { min: 16, max: 20, color: 'rgba(255, 80, 0, 1)' }, // 진한 주황
    { min: 20, max: 24, color: 'rgba(220, 0, 0, 1)' }, // 빨강
    { min: 24, max: 28, color: 'rgba(120, 0, 0, 1)' }, // 암적색
    { min: 28, max: Infinity, color: 'rgba(50, 0, 0, 1)' }, // 매우 진한 적갈
  ],
  O3: [
    {
      min: 0.0,
      max: 0.01,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 0.01,
      max: 0.02,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 0.02,
      max: 0.03,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 0.03,
      max: 0.04,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 0.04,
      max: 0.05,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 0.05,
      max: 0.06,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 0.06,
      max: 0.07,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 0.07,
      max: 0.08,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 0.08,
      max: 0.09,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 0.09,
      max: 0.1,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 0.1,
      max: 0.11,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 0.11,
      max: 0.12,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 0.12,
      max: 0.13,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 0.13,
      max: 0.14,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 0.14,
      max: 0.15,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 0.15,
      max: 0.16,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 0.16,
      max: 0.17,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 0.17,
      max: 0.18,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 0.18,
      max: 0.19,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 0.19,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
  SO2: [
    {
      min: 0.0,
      max: 0.006,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 0.006,
      max: 0.013,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 0.013,
      max: 0.02,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 0.02,
      max: 0.025,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 0.025,
      max: 0.03,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 0.03,
      max: 0.035,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 0.035,
      max: 0.04,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 0.04,
      max: 0.045,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 0.045,
      max: 0.05,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 0.05,
      max: 0.067,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 0.067,
      max: 0.084,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 0.084,
      max: 0.101,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 0.101,
      max: 0.118,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 0.118,
      max: 0.134,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 0.134,
      max: 0.15,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 0.15,
      max: 0.16,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 0.16,
      max: 0.17,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 0.17,
      max: 0.18,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 0.18,
      max: 0.19,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 0.19,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
  NO2: [
    {
      min: 0.0,
      max: 0.01,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 0.01,
      max: 0.02,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 0.02,
      max: 0.03,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 0.03,
      max: 0.035,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 0.035,
      max: 0.04,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 0.04,
      max: 0.045,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 0.045,
      max: 0.05,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 0.05,
      max: 0.055,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 0.055,
      max: 0.06,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 0.06,
      max: 0.08,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 0.08,
      max: 0.1,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 0.1,
      max: 0.12,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 0.12,
      max: 0.14,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 0.14,
      max: 0.17,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 0.17,
      max: 0.2,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 0.2,
      max: 0.21,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 0.21,
      max: 0.22,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 0.22,
      max: 0.23,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 0.23,
      max: 0.24,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 0.24,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
  CO: [
    {
      min: 0.0,
      max: 0.6,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 0.6,
      max: 1.3,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 1.3,
      max: 2.0,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 2.0,
      max: 3.1,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 3.1,
      max: 4.2,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 4.2,
      max: 5.4,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 5.4,
      max: 6.6,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 6.6,
      max: 7.8,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 7.8,
      max: 9,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 9,
      max: 10,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 10,
      max: 11,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 11,
      max: 12,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 12,
      max: 13,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 13,
      max: 14,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 14,
      max: 15,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 15,
      max: 16,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 16,
      max: 17,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 17,
      max: 18,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 18,
      max: 19,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 19,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
  PM10: [
    {
      min: 0,
      max: 6,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 6,
      max: 18,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 18,
      max: 31,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 31,
      max: 40,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 40,
      max: 48,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 48,
      max: 56,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 56,
      max: 64,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 64,
      max: 72,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 72,
      max: 81,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 81,
      max: 93,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 93,
      max: 105,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 105,
      max: 117,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 117,
      max: 130,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 130,
      max: 142,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 142,
      max: 151,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 151,
      max: 191,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 191,
      max: 231,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 231,
      max: 271,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 271,
      max: 320,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 320,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
  'PM2.5': [
    {
      min: 0,
      max: 5,
      color: 'rgba(135, 192, 232, 1)',
    },
    {
      min: 5,
      max: 10,
      color: 'rgba(76, 162, 244, 1)',
    },
    {
      min: 10,
      max: 16,
      color: 'rgba(53, 150, 249, 1)',
    },
    {
      min: 16,
      max: 19,
      color: 'rgba(99, 254, 99, 1)',
    },
    {
      min: 19,
      max: 22,
      color: 'rgba(0, 234, 0, 1)',
    },
    {
      min: 22,
      max: 26,
      color: 'rgba(0, 216, 0, 1)',
    },
    {
      min: 26,
      max: 30,
      color: 'rgba(0, 177, 0, 1)',
    },
    {
      min: 30,
      max: 33,
      color: 'rgba(0, 138, 0, 1)',
    },
    {
      min: 33,
      max: 36,
      color: 'rgba(0, 117, 0, 1)',
    },
    {
      min: 36,
      max: 42,
      color: 'rgba(224, 224, 0, 1)',
    },
    {
      min: 42,
      max: 48,
      color: 'rgba(193, 193, 0, 1)',
    },
    {
      min: 48,
      max: 55,
      color: 'rgba(177, 177, 0, 1)',
    },
    {
      min: 55,
      max: 62,
      color: 'rgba(146, 146, 0, 1)',
    },
    {
      min: 62,
      max: 69,
      color: 'rgba(115, 115, 0, 1)',
    },
    {
      min: 69,
      max: 76,
      color: 'rgba(100, 100, 0, 1)',
    },
    {
      min: 76,
      max: 107,
      color: 'rgba(255, 150, 150, 1)',
    },
    {
      min: 107,
      max: 138,
      color: 'rgba(255, 120, 120, 1)',
    },
    {
      min: 138,
      max: 169,
      color: 'rgba(255, 90, 90, 1)',
    },
    {
      min: 169,
      max: 200,
      color: 'rgba(255, 60, 60, 1)',
    },
    {
      min: 200,
      max: Infinity,
      color: 'rgba(255, 0, 0, 1)',
    },
  ],
  WD: [
    { min: 0.0, max: 11.25, label: 'N', color: 'rgba(50, 136, 189, 1)' },
    { min: 11.25, max: 33.75, label: 'NNE', color: 'rgba(63, 150, 185, 1)' },
    { min: 33.75, max: 56.25, label: 'NE', color: 'rgba(76, 163, 180, 1)' },
    { min: 56.25, max: 78.75, label: 'ENE', color: 'rgba(86, 170, 178, 1)' },
    { min: 78.75, max: 101.25, label: 'E', color: 'rgba(103, 187, 171, 1)' },
    { min: 101.25, max: 123.75, label: 'ESE', color: 'rgba(121, 200, 164, 1)' },
    { min: 123.75, max: 146.25, label: 'SE', color: 'rgba(146, 213, 164, 1)' },
    { min: 146.25, max: 168.75, label: 'SSE', color: 'rgba(171, 221, 164, 1)' },
    { min: 168.75, max: 191.25, label: 'S', color: 'rgba(200, 233, 158, 1)' },
    { min: 191.25, max: 213.75, label: 'SSW', color: 'rgba(230, 245, 152, 1)' },
    { min: 213.75, max: 236.25, label: 'SW', color: 'rgba(247, 234, 146, 1)' },
    { min: 236.25, max: 258.75, label: 'WSW', color: 'rgba(254, 224, 139, 1)' },
    { min: 258.75, max: 281.25, label: 'W', color: 'rgba(253, 199, 118, 1)' },
    { min: 281.25, max: 303.75, label: 'WNW', color: 'rgba(253, 174, 97, 1)' },
    { min: 303.75, max: 326.25, label: 'NW', color: 'rgba(248, 140, 78, 1)' },
    { min: 326.25, max: 348.75, label: 'NNW', color: 'rgba(244, 109, 67, 1)' },
    { min: 348.75, max: 360.0, label: 'N', color: 'rgba(50, 136, 189, 1)' },
  ],
  CFRAC: [
    { min: 0.0, max: 0.1, color: 'rgba(230, 245, 152, 1)' },
    { min: 0.1, max: 0.2, color: 'rgba(200, 233, 158, 1)' },
    { min: 0.2, max: 0.3, color: 'rgba(171, 221, 164, 1)' },
    { min: 0.3, max: 0.4, color: 'rgba(146, 213, 164, 1)' },
    { min: 0.4, max: 0.5, color: 'rgba(121, 200, 164, 1)' },
    { min: 0.5, max: 0.6, color: 'rgba(103, 187, 171, 1)' },
    { min: 0.6, max: 0.7, color: 'rgba(86, 170, 178, 1)' },
    { min: 0.7, max: 0.8, color: 'rgba(76, 163, 180, 1)' },
    { min: 0.8, max: 0.9, color: 'rgba(63, 150, 185, 1)' },
    { min: 0.9, max: 1.0, color: 'rgba(50, 136, 189, 1)' },
  ],
  PBL: [
    { min: 0, max: 200, color: 'rgba(255, 230, 230, 1)' },
    { min: 200, max: 400, color: 'rgba(255, 210, 210, 1)' },
    { min: 400, max: 600, color: 'rgba(255, 190, 190, 1)' },
    { min: 600, max: 800, color: 'rgba(255, 170, 170, 1)' },
    { min: 800, max: 1000, color: 'rgba(255, 140, 140, 1)' },
    { min: 1000, max: 1200, color: 'rgba(255, 110, 110, 1)' },
    { min: 1200, max: 1400, color: 'rgba(255, 80, 80, 1)' },
    { min: 1400, max: 1600, color: 'rgba(255, 60, 60, 1)' },
    { min: 1600, max: 1800, color: 'rgba(230, 40, 40, 1)' },
    { min: 1800, max: 2000, color: 'rgba(200, 20, 20, 1)' },
    { min: 2000, max: Infinity, color: 'rgba(150, 0, 0, 1)' },
  ],
  PRSFC: [
    { min: 500, max: 600, color: 'rgba(49, 0, 82, 1)' },
    { min: 600, max: 700, color: 'rgba(76, 0, 153, 1)' },
    { min: 700, max: 800, color: 'rgba(0, 0, 204, 1)' },
    { min: 800, max: 900, color: 'rgba(0, 102, 204, 1)' },
    { min: 900, max: 950, color: 'rgba(0, 180, 180, 1)' },
    { min: 950, max: 980, color: 'rgba(120, 210, 80, 1)' },
    { min: 980, max: 1000, color: 'rgba(255, 200, 0, 1)' },
    { min: 1000, max: 1015, color: 'rgba(255, 140, 0, 1)' },
    { min: 1015, max: 1030, color: 'rgba(255, 80, 0, 1)' },
    { min: 1030, max: Infinity, color: 'rgba(220, 0, 0, 1)' },
  ],
  RGRND: [
    { min: 0, max: 50, color: 'rgba(49, 0, 82, 1)' },
    { min: 50, max: 100, color: 'rgba(76, 0, 153, 1)' },
    { min: 100, max: 200, color: 'rgba(0, 0, 204, 1)' },
    { min: 200, max: 300, color: 'rgba(0, 102, 204, 1)' },
    { min: 300, max: 400, color: 'rgba(0, 180, 180, 1)' },
    { min: 400, max: 500, color: 'rgba(120, 210, 80, 1)' },
    { min: 500, max: 600, color: 'rgba(255, 200, 0, 1)' },
    { min: 600, max: 700, color: 'rgba(255, 140, 0, 1)' },
    { min: 700, max: 800, color: 'rgba(255, 80, 0, 1)' },
    { min: 800, max: 900, color: 'rgba(220, 0, 0, 1)' },
    { min: 900, max: Infinity, color: 'rgba(120, 0, 0, 1)' },
  ],
};

/* ==============================
 * Earth Temperature Segments
 * ============================== */

// export const EARTH_TEMP_SEGMENTS = [
//   [193, [37, 4, 42]],
//   [206, [41, 10, 130]],
//   [219, [81, 40, 40]],
//   [233.15, [192, 37, 149]],
//   [255.372, [70, 215, 215]],
//   [273.15, [21, 84, 187]],
//   [275.15, [24, 132, 14]],
//   [291, [247, 251, 59]],
//   [298, [235, 167, 21]],
//   [311, [230, 71, 39]],
//   [328, [88, 27, 67]],
// ];

/* ==============================
 * Utils (여기 같이 두는 게 좋음)
 * ============================== */

export function rgbaToRgbArray(rgba) {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function rgbsToEarthSegments(rgbs) {
  return rgbs
    .filter(r => Number.isFinite(r.min))
    .map(r => [r.min, rgbaToRgbArray(r.color)]);
}

/* ==============================
 * Earth Segments Map
 * ============================== */

export const EARTH_SEGMENTS_MAP = {
  WS: rgbsToEarthSegments(RGBA_RANGES.WS),
  CAI: rgbsToEarthSegments(RGBA_RANGES.CAI),
  TEMP: rgbsToEarthSegments(RGBA_RANGES.TEMP),
  O3: rgbsToEarthSegments(RGBA_RANGES.O3),
  SO2: rgbsToEarthSegments(RGBA_RANGES.SO2),
  NO2: rgbsToEarthSegments(RGBA_RANGES.NO2),
  CO: rgbsToEarthSegments(RGBA_RANGES.CO),
  PM10: rgbsToEarthSegments(RGBA_RANGES.PM10),
  'PM2.5': rgbsToEarthSegments(RGBA_RANGES['PM2.5']),
  WD: rgbsToEarthSegments(RGBA_RANGES.WD),
  CFRAC: rgbsToEarthSegments(RGBA_RANGES.CFRAC),
  PBL: rgbsToEarthSegments(RGBA_RANGES.PBL),
  PRSFC: rgbsToEarthSegments(RGBA_RANGES.PRSFC),
  RGRND: rgbsToEarthSegments(RGBA_RANGES.RGRND),
};

export const EARTH_SCALE_META = {
  WS: {
    unit: 'm/s',
    format: v => v.toFixed(2),
    labelFormat: v => v.toFixed(2),
  },
  CAI: {
    unit: '',
    format: v => v.toFixed(0),
    labelFormat: v => v.toFixed(0),
  },
  TEMP: {
    unit: '℃',
    format: v => v.toFixed(1),
    labelFormat: v => v.toFixed(0),
  },
  O3: {
    unit: 'ppm',
    format: v => v.toFixed(3),
    labelFormat: v => v.toFixed(3),
  },
  SO2: {
    unit: 'ppm',
    format: v => v.toFixed(4),
    labelFormat: v => v.toFixed(4),
  },
  NO2: {
    unit: 'ppm',
    format: v => v.toFixed(4),
    labelFormat: v => v.toFixed(4),
  },
  CO: {
    unit: 'ppm',
    format: v => v.toFixed(2),
    labelFormat: v => v.toFixed(2),
  },
  PM10: {
    unit: 'µg/m³',
    format: v => Math.round(v),
    labelFormat: v => Math.round(v),
  },
  'PM2.5': {
    unit: 'µg/m³',
    format: v => Math.round(v),
    labelFormat: v => Math.round(v),
  },
  WD: {
    unit: '°',
    format: v => v.toFixed(2),
    labelFormat: v => v.toFixed(2),
  },
  CFRAC: {
    unit: '',
    format: v => v.toFixed(3),
    labelFormat: v => v.toFixed(3),
  },
  PBL: {
    unit: 'm',
    format: v => v.toFixed(1),
    labelFormat: v => v.toFixed(1),
  },
  PRSFC: {
    unit: 'hPa',
    format: v => v.toFixed(1),
    labelFormat: v => v.toFixed(1),
  },
  RGRND: {
    unit: ' W/m²',
    format: v => v.toFixed(1),
    labelFormat: v => v.toFixed(1),
  },
};
