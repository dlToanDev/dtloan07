import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Gộp class Tailwind: clsx xử lý điều kiện, twMerge khử class xung đột
 * (ví dụ `px-2` do prop truyền vào phải thắng `px-4` mặc định của component).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
