export type BadgeOpType = string;
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';
export type BadgeStyle = 'solid' | 'soft' | 'outline';

interface BadgeProps {
  label: string;
  opType?: BadgeOpType;
  size?: BadgeSize;
  style?: BadgeStyle;
  className?: string;
  variantClass?: string;
}

const getOpTypeBadgeVariant = (opType: string | undefined): BadgeOpType => {
  if (!opType) return 'neutral';

  switch (opType.toLowerCase()) {
    case 'event':
      return 'success';
    case 'render':
      return 'info';
    case 'sub/dispose':
      return 'secondary';
    case 'sub/run':
      return 'primary';
    case 'sub':
      return 'warning';
    default:
      return 'neutral';
  }
};

export function Badge({label, opType, size = 'xs', style = 'soft', className = '', variantClass}: BadgeProps) {
  const baseClasses = 'badge';
  const newVariantClass = variantClass ? variantClass : `badge-${getOpTypeBadgeVariant(opType)}`;
  const sizeClass = size !== 'md' ? `badge-${size}` : '';
  const styleClass = style !== 'solid' ? `badge-${style}` : '';
  
  const classes = [baseClasses, newVariantClass, sizeClass, styleClass, className, "whitespace-nowrap"].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {label}
    </span>
  );
}