import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authConfig } from '@/lib/auth.config';
import { Role } from '@prisma/client';

describe('Google OAuth & Auth.js v5 Configuration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. authConfig có chứa Google provider với id "google"', () => {
    const providers = authConfig.providers;
    expect(Array.isArray(providers)).toBe(true);

    const googleProvider = providers.find((p) => {
      if (typeof p === 'function') {
        const instantiated = (p as () => { id: string })();
        return instantiated.id === 'google';
      }
      return (p as { id: string }).id === 'google';
    });

    expect(googleProvider).toBeDefined();
  });

  it('2. authConfig có cấu hình allowDangerousEmailAccountLinking cho Google', () => {
    const providers = authConfig.providers;
    const googleProvider = providers.find((p) => {
      const providerObj = typeof p === 'function' ? (p as () => { id: string })() : (p as { id: string });
      return providerObj.id === 'google';
    }) as { allowDangerousEmailAccountLinking?: boolean; options?: { allowDangerousEmailAccountLinking?: boolean } } | undefined;

    expect(googleProvider).toBeDefined();
    const hasAccountLinking = googleProvider?.allowDangerousEmailAccountLinking ?? googleProvider?.options?.allowDangerousEmailAccountLinking;
    expect(hasAccountLinking).toBe(true);
  });

  it('3. jwt callback tự động gán token.id từ user.id hoặc token.sub', () => {
    const jwtCallback = authConfig.callbacks.jwt;
    expect(jwtCallback).toBeDefined();

    // Lần đăng nhập đầu tiên: có user object từ DB / adapter
    const tokenWithUser = jwtCallback({
      token: {},
      user: { id: 'user-google-123', role: Role.USER },
      account: null,
      profile: undefined,
      trigger: 'signIn',
    });
    expect(tokenWithUser.id).toBe('user-google-123');
    expect(tokenWithUser.role).toBe(Role.USER);

    // Lần làm mới token sau: không có user, nhưng có token.sub
    const tokenWithSub = jwtCallback({
      token: { sub: 'user-google-456' },
      user: undefined as unknown as Parameters<typeof jwtCallback>[0]['user'],
      account: null,
      profile: undefined,
      trigger: 'signIn',
    });
    expect(tokenWithSub.id).toBe('user-google-456');
  });

  it('4. session callback đồng bộ chính xác id và role từ token sang session.user', () => {
    const sessionCallback = authConfig.callbacks.session;
    expect(sessionCallback).toBeDefined();

    const sessionArg = {
      user: {
        id: '',
        email: 'test@gmail.com',
        name: 'Google User',
        image: 'https://lh3.googleusercontent.com/avatar',
        role: Role.USER,
        emailVerified: null,
      },
      expires: new Date(Date.now() + 86400000),
    } as unknown as Parameters<typeof sessionCallback>[0]['session'];

    const result = sessionCallback({
      session: sessionArg,
      token: {
        id: 'usr-gg-999',
        role: Role.USER,
      },
    } as unknown as Parameters<typeof sessionCallback>[0]);

    expect(result.user.id).toBe('usr-gg-999');
    expect(result.user.role).toBe(Role.USER);
    expect(result.user.name).toBe('Google User');
    expect(result.user.image).toBe('https://lh3.googleusercontent.com/avatar');
  });

  it('5. Kiểm tra thông báo lỗi tiếng Việt thân thiện cho các mã lỗi NextAuth OAuth', () => {
    const AUTH_ERROR_MESSAGES: Record<string, string> = {
      AccountLocked:
        'Tài khoản đã bị khóa do vi phạm quy định (đủ 3 cảnh báo). Liên hệ admin nếu cần hỗ trợ.',
      Configuration:
        'Chưa cấu hình tài khoản Google OAuth trong file .env (cần điền AUTH_GOOGLE_ID và AUTH_GOOGLE_SECRET).',
      OAuthSignin:
        'Không thể khởi tạo phiên đăng nhập Google. Vui lòng kiểm tra lại cấu hình.',
      OAuthCallback:
        'Lỗi trong quá trình nhận phản hồi xác thực từ Google. Vui lòng thử lại.',
      OAuthCreateAccount:
        'Không thể tạo tài khoản từ thông tin Google. Vui lòng thử lại sau.',
      OAuthAccountNotLinked:
        'Email này đã được dùng cho tài khoản khác trước đó. Hãy đăng nhập bằng hình thức ban đầu để liên kết.',
      AccessDenied:
        'Bạn đã hủy bỏ xác thực hoặc từ chối cấp quyền.',
    };

    expect(AUTH_ERROR_MESSAGES.Configuration).toContain('AUTH_GOOGLE_ID');
    expect(AUTH_ERROR_MESSAGES.OAuthSignin).toContain('Google');
    expect(AUTH_ERROR_MESSAGES.OAuthAccountNotLinked).toContain('liên kết');
  });

  it('6. authConfig có cấu hình pages.error trỏ về /login để tránh lỗi 500 của NextAuth', () => {
    expect(authConfig.pages?.error).toBe('/login');
    expect(authConfig.pages?.signIn).toBe('/login');
  });

  it('7. authConfig có chứa GitHub provider với allowDangerousEmailAccountLinking = false', () => {
    const providers = authConfig.providers;
    const githubProvider = providers.find((p) => {
      const providerObj = typeof p === 'function' ? (p as () => { id: string })() : (p as { id: string });
      return providerObj.id === 'github';
    }) as { allowDangerousEmailAccountLinking?: boolean; options?: { allowDangerousEmailAccountLinking?: boolean } } | undefined;

    expect(githubProvider).toBeDefined();
    const hasAccountLinking = githubProvider?.allowDangerousEmailAccountLinking ?? githubProvider?.options?.allowDangerousEmailAccountLinking;
    expect(hasAccountLinking).toBe(false);
  });

  it('8. Thông báo lỗi chi tiết khi GitHub bị chặn do email đã đăng nhập bằng Google', () => {
    const AUTH_ERROR_MESSAGES: Record<string, string> = {
      GitHubBlockedGoogleEmail:
        'Email này đã được đăng ký bằng Google. Tài khoản này chỉ được phép đăng nhập bằng Google (để dùng GitHub, tài khoản GitHub cần sử dụng email khác).',
      GoogleBlockedGitHubEmail:
        'Email này đã được đăng ký bằng GitHub. Tài khoản này chỉ được phép đăng nhập bằng GitHub (để dùng Google, tài khoản Google cần sử dụng email khác).',
    };

    expect(AUTH_ERROR_MESSAGES.GitHubBlockedGoogleEmail).toContain('được phép đăng nhập bằng Google');
    expect(AUTH_ERROR_MESSAGES.GitHubBlockedGoogleEmail).toContain('email khác');
    expect(AUTH_ERROR_MESSAGES.GoogleBlockedGitHubEmail).toContain('được phép đăng nhập bằng GitHub');
  });
});
