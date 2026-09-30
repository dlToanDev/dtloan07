import { LANGUAGES, MAX_RUN_CPU_MS, MAX_RUN_TIMEOUT_MS } from '@/lib/judge/languages';
import type { CodeRunner, RunRequest, RunResult } from '@/lib/judge/types';

/** Phần kết quả Piston trả về cho một giai đoạn (compile / run). */
interface PistonStage {
  stdout?: string;
  stderr?: string;
  code?: number | null;
  signal?: string | null;
  status?: string | null; // "TO" quá giờ, "OL"/"EL" output quá dài, "SG" signal, "RE" lỗi chạy, "XX" lỗi nội bộ
  message?: string | null;
  cpu_time?: number;
  wall_time?: number;
  memory?: number; // byte
}

interface PistonResponse {
  compile?: PistonStage;
  run?: PistonStage;
  message?: string;
}

/**
 * Quy kết quả Piston về RunResult chung. Quá thời gian được xét theo thời gian CPU của chương
 * trình (`cpuLimitMs` = giới hạn bài + thời gian khởi động của ngôn ngữ), không theo thời gian
 * thực — máy chấm đang bận thì thời gian thực tăng nhưng không phải lỗi của học viên. Giới hạn
 * thời gian thực (run_timeout) chỉ là lưới an toàn cho vòng lặp vô hạn.
 */
export function mapPistonResponse(
  response: PistonResponse,
  memoryLimitMb: number,
  cpuLimitMs = Infinity,
): RunResult {
  const compile = response.compile;
  if (compile && compile.code !== 0 && compile.code !== undefined)
    return {
      status: 'COMPILE_ERROR',
      stdout: compile.stdout ?? '',
      stderr: compile.stderr || compile.stdout || compile.message || 'Lỗi biên dịch.',
      timeMs: compile.wall_time ?? 0,
      memoryKb: Math.round((compile.memory ?? 0) / 1024),
    };

  const run = response.run;
  if (!run) throw new Error(response.message || 'Piston không trả kết quả chạy.');
  const memoryKb = Math.round((run.memory ?? 0) / 1024);
  const base = {
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
    timeMs: run.cpu_time ?? run.wall_time ?? 0,
    memoryKb,
  };
  if (run.status === 'XX') throw new Error(run.message || 'Piston lỗi nội bộ.');
  if (run.status === 'TO') return { ...base, status: 'TIME_LIMIT' };
  // Output vượt PISTON_OUTPUT_MAX_SIZE (in quá nhiều, thường do vòng lặp in không dừng).
  if (run.status === 'OL' || run.status === 'EL')
    return {
      ...base,
      status: 'RUNTIME_ERROR',
      stderr: 'Output quá dài — kiểm tra vòng lặp in kết quả.',
    };
  // Bị giết do vượt RAM: exit 137 / SIGKILL khi bộ nhớ đã chạm giới hạn.
  const hitMemory = memoryKb >= memoryLimitMb * 1024 * 0.95;
  if ((run.code === 137 || run.signal === 'SIGKILL') && hitMemory)
    return { ...base, status: 'MEMORY_LIMIT' };
  if ((run.cpu_time ?? 0) > cpuLimitMs) return { ...base, status: 'TIME_LIMIT' };
  if (run.code !== 0 || run.signal) return { ...base, status: 'RUNTIME_ERROR' };
  return { ...base, status: 'OK' };
}

/** Runner gọi Piston qua HTTP (chỉ nghe 127.0.0.1 trên VPS). */
export class PistonRunner implements CodeRunner {
  constructor(
    private readonly baseUrl = process.env.PISTON_URL || 'http://127.0.0.1:2000',
    private readonly token = process.env.PISTON_TOKEN,
  ) {}

  async run(request: RunRequest): Promise<RunResult> {
    const language = LANGUAGES[request.language];
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v2/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: this.token }),
      },
      body: JSON.stringify({
        language: language.piston,
        version: '*',
        files: [{ name: language.file, content: request.code }],
        stdin: request.stdin,
        compile_timeout: 10_000,
        // Lưới an toàn thời gian thực: rộng gấp đôi để máy bận không làm chấm oan.
        run_timeout: Math.min(
          2 * (request.timeLimitMs + language.extraTimeMs) + 1000,
          MAX_RUN_TIMEOUT_MS,
        ),
        // Giới hạn thật: thời gian CPU của chương trình (Piston cắt khi vượt, trả status "TO").
        run_cpu_time: Math.min(request.timeLimitMs + language.extraTimeMs, MAX_RUN_CPU_MS),
        compile_memory_limit: -1,
        run_memory_limit: request.memoryLimitMb * 1024 * 1024,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = (await response.json().catch(() => ({}))) as PistonResponse;
    if (!response.ok) throw new Error(body.message || `Piston HTTP ${response.status}`);
    return mapPistonResponse(
      body,
      request.memoryLimitMb,
      request.timeLimitMs + language.extraTimeMs,
    );
  }
}
