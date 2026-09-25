/**
 * 34 đơn vị hành chính cấp tỉnh của Việt Nam theo sắp xếp có hiệu lực từ 01/07/2025:
 * 6 thành phố trực thuộc trung ương và 28 tỉnh.
 *
 * `code` là slug không dấu, dùng làm khóa lưu trong `ShippingZone.provinces`
 * và trong `Order.shipProvince` — đổi `name` không làm hỏng dữ liệu cũ.
 */
export interface Province {
  code: string;
  name: string;
}

export const PROVINCES: Province[] = [
  // Thành phố trực thuộc trung ương
  { code: 'ha-noi', name: 'Hà Nội' },
  { code: 'hai-phong', name: 'Hải Phòng' },
  { code: 'hue', name: 'Huế' },
  { code: 'da-nang', name: 'Đà Nẵng' },
  { code: 'ho-chi-minh', name: 'TP. Hồ Chí Minh' },
  { code: 'can-tho', name: 'Cần Thơ' },

  // Tỉnh
  { code: 'an-giang', name: 'An Giang' },
  { code: 'bac-ninh', name: 'Bắc Ninh' },
  { code: 'ca-mau', name: 'Cà Mau' },
  { code: 'cao-bang', name: 'Cao Bằng' },
  { code: 'dak-lak', name: 'Đắk Lắk' },
  { code: 'dien-bien', name: 'Điện Biên' },
  { code: 'dong-nai', name: 'Đồng Nai' },
  { code: 'dong-thap', name: 'Đồng Tháp' },
  { code: 'gia-lai', name: 'Gia Lai' },
  { code: 'ha-tinh', name: 'Hà Tĩnh' },
  { code: 'hung-yen', name: 'Hưng Yên' },
  { code: 'khanh-hoa', name: 'Khánh Hòa' },
  { code: 'lai-chau', name: 'Lai Châu' },
  { code: 'lam-dong', name: 'Lâm Đồng' },
  { code: 'lang-son', name: 'Lạng Sơn' },
  { code: 'lao-cai', name: 'Lào Cai' },
  { code: 'nghe-an', name: 'Nghệ An' },
  { code: 'ninh-binh', name: 'Ninh Bình' },
  { code: 'phu-tho', name: 'Phú Thọ' },
  { code: 'quang-ngai', name: 'Quảng Ngãi' },
  { code: 'quang-ninh', name: 'Quảng Ninh' },
  { code: 'quang-tri', name: 'Quảng Trị' },
  { code: 'son-la', name: 'Sơn La' },
  { code: 'tay-ninh', name: 'Tây Ninh' },
  { code: 'thai-nguyen', name: 'Thái Nguyên' },
  { code: 'thanh-hoa', name: 'Thanh Hóa' },
  { code: 'tuyen-quang', name: 'Tuyên Quang' },
  { code: 'vinh-long', name: 'Vĩnh Long' },
];

const PROVINCE_BY_CODE = new Map(PROVINCES.map((province) => [province.code, province]));

export function provinceName(code: string | null | undefined) {
  return (code && PROVINCE_BY_CODE.get(code)?.name) || '';
}

export function isValidProvince(code: string | null | undefined): boolean {
  return Boolean(code && PROVINCE_BY_CODE.has(code));
}
