'use client';

import { useState } from 'react';
import {
  FileText,
  Ruler,
  ShieldCheck,
  Star,
  CheckCircle2,
  Truck,
  RotateCcw,
  HelpCircle,
  ThumbsUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { conditionLabel } from '@/lib/shop/labels';

interface ProductDetailTabsProps {
  product: {
    id: string;
    slug: string;
    name: string;
    type: 'DOWNLOAD' | 'PHYSICAL' | 'ACCOUNT';
    category?: { name: string; slug?: string } | null;
    condition?: string | null;
    conditionNote?: string | null;
    warrantyNote?: string | null;
    version?: string;
    deliveryMode?: 'AUTO' | 'MANUAL' | null;
  };
  children: React.ReactNode;
}

export function ProductDetailTabs({ product, children }: ProductDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'policy' | 'reviews'>('desc');

  const isFashion =
    product.category?.name?.toLowerCase().includes('thời trang') ||
    product.slug.includes('ao-') ||
    product.slug.includes('quan-') ||
    product.slug.includes('mu-');
  const isTech = product.type === 'PHYSICAL' && !isFashion;
  const isCode = product.type === 'DOWNLOAD';
  const isAccount = product.type === 'ACCOUNT';

  return (
    <div className="space-y-6">
      {/* Thanh chuyển Tab phong cách hiện đại */}
      <div className="border-border/80 flex scrollbar-none gap-2 overflow-x-auto border-b sm:gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('desc')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all sm:text-base',
            activeTab === 'desc'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground hover:border-border border-transparent',
          )}
        >
          <FileText className="h-4 w-4" />
          Mô tả sản phẩm
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('specs')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all sm:text-base',
            activeTab === 'specs'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground hover:border-border border-transparent',
          )}
        >
          <Ruler className="h-4 w-4" />
          {isFashion ? 'Bảng Size & Thông số' : 'Thông số kỹ thuật'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('policy')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all sm:text-base',
            activeTab === 'policy'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground hover:border-border border-transparent',
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          Chính sách & Bảo hành
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all sm:text-base',
            activeTab === 'reviews'
              ? 'border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground hover:border-border border-transparent',
          )}
        >
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          Đánh giá (48)
        </button>
      </div>

      {/* Nội dung Tab */}
      <div className="pt-2">
        {/* TAB 1: MÔ TẢ CHI TIẾT */}
        {activeTab === 'desc' && (
          <div className="animate-in fade-in-50 space-y-8 duration-200">
            {/* Banner tóm tắt ưu điểm */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="border-border/80 bg-card space-y-1 rounded-xl border p-3 text-center sm:p-4">
                <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
                <div className="text-foreground text-xs font-semibold sm:text-sm">Cam kết 100%</div>
                <div className="text-muted-foreground text-[11px]">
                  Chính hãng & Chuẩn chất lượng
                </div>
              </div>
              <div className="border-border/80 bg-card space-y-1 rounded-xl border p-3 text-center sm:p-4">
                <Truck className="mx-auto h-5 w-5 text-sky-500" />
                <div className="text-foreground text-xs font-semibold sm:text-sm">
                  Giao hàng nhanh
                </div>
                <div className="text-muted-foreground text-[11px]">Kiểm tra trước khi nhận</div>
              </div>
              <div className="border-border/80 bg-card space-y-1 rounded-xl border p-3 text-center sm:p-4">
                <RotateCcw className="mx-auto h-5 w-5 text-indigo-500" />
                <div className="text-foreground text-xs font-semibold sm:text-sm">
                  Đổi trả 7 ngày
                </div>
                <div className="text-muted-foreground text-[11px]">Hỗ trợ đổi size tận nơi</div>
              </div>
              <div className="border-border/80 bg-card space-y-1 rounded-xl border p-3 text-center sm:p-4">
                <HelpCircle className="mx-auto h-5 w-5 text-emerald-500" />
                <div className="text-foreground text-xs font-semibold sm:text-sm">Tư vấn 24/7</div>
                <div className="text-muted-foreground text-[11px]">Hỗ trợ kỹ thuật 1-1</div>
              </div>
            </div>

            {/* Chi tiết nội dung biên tập Markdown */}
            <div className="border-border/80 bg-card rounded-2xl border p-6 shadow-xs sm:p-8">
              <div className="prose prose-zinc dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-img:rounded-xl max-w-none">
                {children}
              </div>
            </div>

            {/* Ghi chú tình trạng & bảo hành nếu có */}
            {(product.conditionNote || product.warrantyNote) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {product.conditionNote && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
                    <h4 className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400">
                      <Sparkles className="h-4 w-4" />
                      Tình trạng hàng hóa:{' '}
                      {product.condition ? conditionLabel(product.condition) : 'Chuẩn'}
                    </h4>
                    <p className="text-foreground/80 mt-1 text-sm leading-relaxed whitespace-pre-line">
                      {product.conditionNote}
                    </p>
                  </div>
                )}
                {product.warrantyNote && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
                    <h4 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="h-4 w-4" />
                      Chính sách bảo hành riêng
                    </h4>
                    <p className="text-foreground/80 mt-1 text-sm leading-relaxed">
                      {product.warrantyNote}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BẢNG SIZE & THÔNG SỐ KỸ THUẬT */}
        {activeTab === 'specs' && (
          <div className="animate-in fade-in-50 space-y-6 duration-200">
            <div className="border-border/80 bg-card space-y-6 rounded-2xl border p-6 shadow-xs sm:p-8">
              <h3 className="text-foreground text-xl font-bold">
                {isFashion ? 'Bảng quy đổi Size & Thông số may đo' : 'Thông số kỹ thuật chi tiết'}
              </h3>

              {isFashion && (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    Bảng size được nghiên cứu phù hợp với thể hình người Việt Nam. Bạn có thể tham
                    khảo bảng kích thước dưới đây để chọn size chuẩn nhất:
                  </p>
                  <div className="border-border overflow-x-auto rounded-xl border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted text-foreground text-xs font-semibold uppercase">
                        <tr>
                          <th className="px-4 py-3">Size</th>
                          <th className="px-4 py-3">Chiều cao (m)</th>
                          <th className="px-4 py-3">Cân nặng (kg)</th>
                          <th className="px-4 py-3">Vòng ngực / eo (cm)</th>
                          <th className="px-4 py-3">Form dáng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-border divide-y">
                        <tr className="hover:bg-muted/40">
                          <td className="text-primary px-4 py-3 font-bold">S</td>
                          <td className="px-4 py-3">1m50 - 1m62</td>
                          <td className="px-4 py-3">45 - 54 kg</td>
                          <td className="px-4 py-3">78 - 84 cm</td>
                          <td className="px-4 py-3">Vừa vặn (Regular)</td>
                        </tr>
                        <tr className="hover:bg-muted/40">
                          <td className="text-primary px-4 py-3 font-bold">M</td>
                          <td className="px-4 py-3">1m60 - 1m70</td>
                          <td className="px-4 py-3">55 - 65 kg</td>
                          <td className="px-4 py-3">85 - 92 cm</td>
                          <td className="px-4 py-3">Thoải mái (Comfort)</td>
                        </tr>
                        <tr className="hover:bg-muted/40">
                          <td className="text-primary px-4 py-3 font-bold">L</td>
                          <td className="px-4 py-3">1m70 - 1m78</td>
                          <td className="px-4 py-3">66 - 76 kg</td>
                          <td className="px-4 py-3">93 - 98 cm</td>
                          <td className="px-4 py-3">Rộng rãi (Oversize)</td>
                        </tr>
                        <tr className="hover:bg-muted/40">
                          <td className="text-primary px-4 py-3 font-bold">XL</td>
                          <td className="px-4 py-3">1m78 - 1m86</td>
                          <td className="px-4 py-3">77 - 90 kg</td>
                          <td className="px-4 py-3">99 - 106 cm</td>
                          <td className="px-4 py-3">Oversize Streetwear</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-xs">
                    💡 <strong>Mẹo chọn size:</strong> Nếu số đo của bạn nằm giữa 2 size hoặc bạn
                    thích mặc rộng thoải mái khi ngồi làm việc lâu, hãy ưu tiên chọn tăng thêm 1
                    size!
                  </div>
                </div>
              )}

              {/* Bảng thuộc tính chung */}
              <div className="border-border overflow-x-auto rounded-xl border">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-border divide-y">
                    <tr className="hover:bg-muted/40">
                      <td className="text-muted-foreground w-1/3 px-4 py-3 font-medium">
                        Tên sản phẩm
                      </td>
                      <td className="text-foreground px-4 py-3 font-semibold">{product.name}</td>
                    </tr>
                    <tr className="hover:bg-muted/40">
                      <td className="text-muted-foreground px-4 py-3 font-medium">
                        Phân loại hàng
                      </td>
                      <td className="text-foreground px-4 py-3">
                        {product.type === 'PHYSICAL'
                          ? 'Hàng vật lý (Giao tận nơi)'
                          : product.type === 'ACCOUNT'
                            ? 'Tài khoản dịch vụ'
                            : 'Source Code & Tài liệu'}
                      </td>
                    </tr>
                    {product.category && (
                      <tr className="hover:bg-muted/40">
                        <td className="text-muted-foreground px-4 py-3 font-medium">Danh mục</td>
                        <td className="text-foreground px-4 py-3">{product.category.name}</td>
                      </tr>
                    )}
                    {product.version && (
                      <tr className="hover:bg-muted/40">
                        <td className="text-muted-foreground px-4 py-3 font-medium">Phiên bản</td>
                        <td className="text-foreground px-4 py-3 font-mono">v{product.version}</td>
                      </tr>
                    )}
                    {product.condition && (
                      <tr className="hover:bg-muted/40">
                        <td className="text-muted-foreground px-4 py-3 font-medium">
                          Tình trạng ngoại quan
                        </td>
                        <td className="text-foreground px-4 py-3">
                          {conditionLabel(product.condition)}
                        </td>
                      </tr>
                    )}
                    {product.deliveryMode && (
                      <tr className="hover:bg-muted/40">
                        <td className="text-muted-foreground px-4 py-3 font-medium">
                          Phương thức bàn giao
                        </td>
                        <td className="text-foreground px-4 py-3">
                          {product.deliveryMode === 'AUTO'
                            ? 'Tự động gửi thông tin qua Email'
                            : 'Bàn giao trực tiếp trong 24h'}
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-muted/40">
                      <td className="text-muted-foreground px-4 py-3 font-medium">
                        Xuất xứ / Đơn vị phân phối
                      </td>
                      <td className="text-foreground px-4 py-3">dltoan07 Tech & Dev Studio</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CHÍNH SÁCH BÁN HÀNG & BẢO HÀNH */}
        {activeTab === 'policy' && (
          <div className="animate-in fade-in-50 space-y-6 duration-200">
            <div className="border-border/80 bg-card space-y-6 rounded-2xl border p-6 shadow-xs sm:p-8">
              <h3 className="text-foreground text-xl font-bold">
                Chính sách cam kết & Quyền lợi khách hàng
              </h3>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="border-border space-y-3 rounded-xl border p-5">
                  <div className="text-primary flex items-center gap-2 text-base font-semibold">
                    <Truck className="h-5 w-5" />
                    Chính sách vận chuyển & Kiểm hàng
                  </div>
                  <ul className="text-muted-foreground list-inside list-disc space-y-2 text-sm">
                    <li>
                      Được quyền <strong>đồng kiểm (kiểm tra ngoại quan)</strong> sản phẩm trước khi
                      thanh toán cho shipper.
                    </li>
                    <li>
                      Giao hàng tiêu chuẩn 1 - 3 ngày trên toàn quốc (Hà Nội & TP.HCM nhận trong 24
                      - 48h).
                    </li>
                    <li>
                      Đóng gói 2 lớp hộp chống sốc bảo vệ sản phẩm tuyệt đối trong quá trình vận
                      chuyển.
                    </li>
                  </ul>
                </div>

                <div className="border-border space-y-3 rounded-xl border p-5">
                  <div className="flex items-center gap-2 text-base font-semibold text-indigo-500">
                    <RotateCcw className="h-5 w-5" />
                    Chính sách đổi trả trong 7 ngày
                  </div>
                  <ul className="text-muted-foreground list-inside list-disc space-y-2 text-sm">
                    <li>
                      Hỗ trợ <strong>đổi size tận nhà miễn phí 1 lần</strong> nếu bạn mặc không vừa
                      hoặc không ưng form dáng.
                    </li>
                    <li>
                      Đổi mới 100% ngay lập tức nếu sản phẩm có lỗi rách vải, bung chỉ, lỗi switch
                      hoặc lỗi phần cứng từ nhà sản xuất.
                    </li>
                    <li>
                      Sản phẩm đổi trả cần giữ nguyên tem mác, chưa qua giặt ủi hoặc sử dụng làm
                      biến dạng.
                    </li>
                  </ul>
                </div>

                <div className="border-border space-y-3 rounded-xl border p-5">
                  <div className="flex items-center gap-2 text-base font-semibold text-emerald-500">
                    <ShieldCheck className="h-5 w-5" />
                    Bảo hành & Cam kết sản phẩm số
                  </div>
                  <ul className="text-muted-foreground list-inside list-disc space-y-2 text-sm">
                    <li>
                      Đối với Source Code: Bảo hành hoạt động đúng mô tả, hỗ trợ cài đặt cấu hình
                      ban đầu miễn phí.
                    </li>
                    <li>
                      Đối với Tài khoản (ChatGPT, Copilot, Cursor...): Bảo hành 1 đổi 1 suốt thời
                      gian gói đăng ký nếu có sự cố.
                    </li>
                    <li>
                      Cập nhật phiên bản vá lỗi và bản cập nhật trọn đời cho các gói source code bản
                      quyền.
                    </li>
                  </ul>
                </div>

                <div className="border-border space-y-3 rounded-xl border p-5">
                  <div className="flex items-center gap-2 text-base font-semibold text-amber-500">
                    <HelpCircle className="h-5 w-5" />
                    Kênh hỗ trợ trực tiếp 24/7
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Mọi thắc mắc hoặc cần hỗ trợ gấp về đơn hàng, bạn có thể nhắn tin trực tiếp qua
                    Zalo / Telegram của Admin hoặc liên hệ qua trang Hỗ trợ để được giải đáp trong
                    vòng 15 phút.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ĐÁNH GIÁ TỪ KHÁCH HÀNG */}
        {activeTab === 'reviews' && (
          <div className="animate-in fade-in-50 space-y-6 duration-200">
            <div className="border-border/80 bg-card space-y-6 rounded-2xl border p-6 shadow-xs sm:p-8">
              {/* Tổng quan xếp hạng sao */}
              <div className="bg-muted/30 border-border/60 flex flex-col items-center gap-8 rounded-xl border p-6 sm:flex-row">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="text-foreground text-5xl font-black">
                    4.9<span className="text-muted-foreground text-xl font-normal">/5</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 sm:justify-start">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-5 w-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">Dựa trên 48 lượt đánh giá thực tế</p>
                </div>

                <div className="w-full max-w-sm flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-10">5 sao</span>
                    <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: '92%' }}
                      ></div>
                    </div>
                    <span className="w-8 text-right font-medium">92%</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-10">4 sao</span>
                    <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: '8%' }}
                      ></div>
                    </div>
                    <span className="w-8 text-right font-medium">8%</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-40">
                    <span className="text-muted-foreground w-10">3 sao</span>
                    <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: '0%' }}
                      ></div>
                    </div>
                    <span className="w-8 text-right font-medium">0%</span>
                  </div>
                </div>
              </div>

              {/* Danh sách bình luận mẫu thực tế */}
              <div className="divide-border space-y-4 divide-y">
                <div className="space-y-2.5 pt-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-primary/20 text-primary flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold">
                        TN
                      </div>
                      <div>
                        <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                          Trần Nam
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 text-[10px] text-emerald-600"
                          >
                            Đã mua hàng
                          </Badge>
                        </div>
                        <div className="text-muted-foreground text-xs">2 ngày trước</div>
                      </div>
                    </div>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-4 w-4 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-foreground/90 text-sm leading-relaxed">
                    Chất lượng hoàn thiện cực kỳ xịn xò! Vải co giãn 4 chiều mềm mịn, ngồi code cả
                    ngày không bị cấn hay nóng tí nào. Đường may chắc chắn, túi đựng vừa iPhone Pro
                    Max thoải mái. Shop ship hàng nhanh chỉ 1 ngày là nhận được!
                  </p>
                  <div className="text-muted-foreground flex items-center gap-2 pt-1 text-xs">
                    <button type="button" className="hover:text-foreground flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5" /> Hữu ích (14)
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-600">
                        LH
                      </div>
                      <div>
                        <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                          Lê Hoàng
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 text-[10px] text-emerald-600"
                          >
                            Đã mua hàng
                          </Badge>
                        </div>
                        <div className="text-muted-foreground text-xs">5 ngày trước</div>
                      </div>
                    </div>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-4 w-4 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-foreground/90 text-sm leading-relaxed">
                    Sản phẩm đúng như ảnh và mô tả. Màu sắc sắc nét, thiết kế rất có chất riêng cho
                    anh em coder. Đóng gói cẩn thận 2 lớp hộp, phục vụ rất chu đáo. Sẽ tiếp tục ủng
                    hộ shop các sản phẩm tiếp theo.
                  </p>
                  <div className="text-muted-foreground flex items-center gap-2 pt-1 text-xs">
                    <button type="button" className="hover:text-foreground flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5" /> Hữu ích (8)
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-600">
                        MD
                      </div>
                      <div>
                        <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                          Minh Đức
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 text-[10px] text-emerald-600"
                          >
                            Đã mua hàng
                          </Badge>
                        </div>
                        <div className="text-muted-foreground text-xs">1 tuần trước</div>
                      </div>
                    </div>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-4 w-4 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-foreground/90 text-sm leading-relaxed">
                    Đáng đồng tiền bát gạo! Ban đầu sợ mua online không vừa size nhưng shop tư vấn
                    chọn size chuẩn chỉnh luôn. Đã giới thiệu cho đồng nghiệp cùng team dev mua
                    thêm. 10/10!
                  </p>
                  <div className="text-muted-foreground flex items-center gap-2 pt-1 text-xs">
                    <button type="button" className="hover:text-foreground flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5" /> Hữu ích (5)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
