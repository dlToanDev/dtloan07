# Khóa học: bài giảng, bài tập code và chấm tự động

Ngày: 2026-09-28 · Trạng thái: giai đoạn 1 và 2 đã xong; giai đoạn 3 chưa làm

## Mục tiêu

Admin tạo khóa học (vd. "C++ cơ bản") gồm Bài 1, 2, 3… Mỗi bài có nội dung (chữ, ảnh, video,
slide), tài liệu tải về và các bài tập cuối bài. Học viên code trực tiếp trên web, hệ thống tự
chấm theo bộ test; làm đúng hết bài tập của bài N thì bài N+1 mới mở.

Quyết định đã chốt với chủ web:

- Ngôn ngữ chấm: C, C++, Python, JavaScript, Java.
- Quy mô đầu: dưới ~20 học viên nộp bài cùng lúc.
- Có khóa miễn phí và khóa trả phí.
- Kiểu chấm: nhập/xuất chuẩn (stdin → stdout). Bài nào cần thì admin soạn code mẫu có sẵn
  `main()` để học viên điền phần còn thiếu — máy chấm vẫn chỉ một kiểu.
- Video: mỗi bài chọn dán link YouTube/Vimeo hoặc upload file (upload ở giai đoạn 2).
- Không chia Chương; danh sách bài liên tục.
- Máy chấm chạy trên cùng VPS với web (Ubuntu 24.04, 4 core / 8 GB).

## Máy chấm: Piston (không dùng Judge0)

Judge0 bản ổn định cần cgroup v1; Ubuntu 24.04 dùng cgroup v2, muốn chạy phải sửa GRUB và khởi
động lại VPS đang chạy web. Piston (engineer-man/piston) chạy trên cgroup v2 và đã được kiểm
chứng trên máy dev Ubuntu 24.04:

- C++ (gcc 10.2), Python 3.12, Node 20, Java 15 chạy đúng.
- Vòng lặp vô hạn → bị giết ở giới hạn thời gian (`status: "TO"`).
- Ngốn RAM → bị giết ở `run_memory_limit` (exit 137).
- Không có mạng trong sandbox.

Chạy bằng Docker, chỉ nghe `127.0.0.1:2000`, giới hạn cứng 2 CPU / 3 GB để web luôn còn tài
nguyên. Piston chỉ "chạy code"; phần so output, tổng hợp kết quả nằm trong web (`src/lib/judge`).
Web nói chuyện với máy chấm qua một interface `CodeRunner`, đổi máy chấm chỉ cần viết runner mới.

## Dữ liệu (Prisma)

`Course` (giữ nguyên bảng, thêm quan hệ) → `Lesson` → `LessonAttachment`, `Exercise` →
`TestCase`. Theo học viên: `Enrollment`, `LessonProgress`, `Submission`.

- `Lesson`: title, slug (duy nhất trong khóa), sortOrder, status (DRAFT/PUBLISHED), content
  (markdown từ trình soạn thảo bài viết), videoUrl (YouTube/Vimeo), slide PDF (R2), isPreview
  (học thử — dùng ở giai đoạn 3).
- `Exercise`: title, statement (markdown), languages cho phép, starterCode theo ngôn ngữ,
  timeLimitMs (≤ 3000), memoryLimitMb.
- `TestCase`: input, expectedOutput, isSample (hiện cho học viên) hay ẩn.
- `Submission`: code, ngôn ngữ, verdict (ACCEPTED / WRONG_ANSWER / TIME_LIMIT / MEMORY_LIMIT /
  RUNTIME_ERROR / COMPILE_ERROR / SYSTEM_ERROR), số test qua, chi tiết từng test.
- `Enrollment` (userId, courseId) và `LessonProgress` (userId, lessonId, completedAt).

## Luồng chấm

1. Học viên bấm **Chạy thử**: chạy với các test mẫu (hoặc input tự nhập), trả về output thật,
   không lưu.
2. Bấm **Nộp bài**: chạy test đầu tiên trước (bắt lỗi biên dịch sớm), rồi các test còn lại song
   song tối đa vài test một lúc; dừng ở test sai đầu tiên. Lưu `Submission`.
3. So output: bỏ `\r`, khoảng trắng cuối dòng và dòng trống cuối.
4. Tất cả bài tập của bài đều từng có bài nộp ACCEPTED → ghi `LessonProgress`, mở bài kế tiếp.
   Bài không có bài tập → nút "Hoàn thành bài học".
5. Không bao giờ gửi input/output của test ẩn về trình duyệt.

Bảo vệ: phải đăng nhập, đã ghi danh, bài đang mở; code tối đa 64 KB; mỗi học viên 1 lần nộp mỗi
vài giây; tối đa 4 lần chạy đồng thời trên cả server (một tiến trình PM2).

## Quyền học

- Khóa miễn phí (priceVnd = 0): đăng nhập, bấm "Bắt đầu học" là ghi danh.
- Khóa trả phí: giai đoạn 1 admin cấp quyền theo email; giai đoạn 3 mua qua PayOS.
- Admin xem được mọi bài, không bị khóa.

## Giai đoạn

1. **Bài giảng + bài tập + máy chấm** (xong): schema, trang admin quản lý bài/bài tập/test,
   trang giới thiệu khóa và trang học, trình soạn code (CodeMirror), chấm qua Piston, tiến độ và
   mở khóa, slide PDF + tài liệu ≤ 10 MB lên R2 với link có hạn, cấp quyền theo email, tài liệu
   triển khai Piston.
2. **Video/tài liệu lớn riêng tư** (xong): trình duyệt upload thẳng lên R2 theo phần 16 MB (video
   ≤ 5 GB, slide ≤ 100 MB, tài liệu ≤ 500 MB); phát / tải qua `/api/courses/files/...` sau khi kiểm
   tra quyền, link R2 có hạn. Cấu hình bucket: `deploy/r2-course-uploads.md`. Lưu ý: S3 client tắt
   checksum mặc định (`requestChecksumCalculation: WHEN_REQUIRED`) — nếu không, PUT theo link ký
   sẵn bị R2 từ chối (BadDigest).
3. **Bán khóa học**: mua qua luồng đơn hàng + PayOS của Shop, học thử các bài `isPreview`.

## Kiểm thử

- Unit: so output, tổng hợp verdict (runner giả), trạng thái mở khóa bài, đọc link video.
- Tích hợp (Postgres thật): nộp bài → lưu Submission → mở bài kế tiếp; chặn khi chưa ghi danh
  hoặc bài đang khóa.
- Tích hợp với Piston thật (bỏ qua nếu không có `PISTON_URL`): chấm đúng/sai/lỗi biên dịch/quá
  thời gian cho C++, Python, JS, Java.
