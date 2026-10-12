'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { COURSE_STATUS } from '@/components/admin/courses/course-status';
import { toggleCourseStatus } from '@/server/actions/course';
import { Loader2, Pause, Play } from 'lucide-react';

interface CourseStatusBadgeButtonProps {
  courseId: string;
  initialStatus: keyof typeof COURSE_STATUS;
}

export function CourseStatusBadgeButton({ courseId, initialStatus }: CourseStatusBadgeButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<keyof typeof COURSE_STATUS>(initialStatus);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (target?: keyof typeof COURSE_STATUS) => {
    startTransition(async () => {
      const res = await toggleCourseStatus(courseId, target);
      if (res.ok) {
        setStatus(res.data.status);
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  const statusConfig = COURSE_STATUS[status];
  const isActive = status === 'ACTIVE';

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.className}`}>
        ● {statusConfig.label}
      </span>

      {isActive ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleToggle('DRAFT')}
          disabled={isPending}
          className="border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 h-7 gap-1.5 px-2.5 text-xs font-medium"
          title="Tạm dừng khóa học (học viên sẽ tạm thời không truy cập được khóa học trên web)"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Pause className="size-3.5" />
          )}
          <span>Tạm dừng</span>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleToggle('ACTIVE')}
          disabled={isPending}
          className="border-success/40 bg-success/10 text-success hover:bg-success/20 h-7 gap-1.5 px-2.5 text-xs font-semibold"
          title="Phát hành khóa học (mở công khai trên web)"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5 fill-current" />
          )}
          <span>Phát hành</span>
        </Button>
      )}
    </div>
  );
}
