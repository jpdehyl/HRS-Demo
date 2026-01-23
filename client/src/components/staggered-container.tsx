import { Children, cloneElement, isValidElement, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StaggeredContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  animation?: 'fade-in-up' | 'fade-in' | 'scale-in' | 'slide-in-right';
}

export function StaggeredContainer({
  children,
  className,
  staggerDelay = 50,
  animation = 'fade-in-up',
}: StaggeredContainerProps) {
  return (
    <div className={className}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;

        return cloneElement(child as React.ReactElement<{ className?: string; style?: React.CSSProperties }>, {
          className: cn(
            (child.props as { className?: string }).className,
            `animate-${animation}`,
            'opacity-0 [animation-fill-mode:forwards]'
          ),
          style: {
            ...(child.props as { style?: React.CSSProperties }).style,
            animationDelay: `${index * staggerDelay}ms`,
          },
        });
      })}
    </div>
  );
}
