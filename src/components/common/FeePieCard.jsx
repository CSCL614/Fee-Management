import React from 'react';
import { formatCurrency } from '../../utils/helpers';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { fadeInUp } from '../../utils/animations';

// Curated professional color palette for fee categories
export const CATEGORY_COLORS = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#f59e0b', // Amber
  '#7c3aed', // Purple
  '#e11d48', // Rose
  '#0284c7', // Sky
  '#16a34a', // Emerald
  '#ea580c', // Orange
  '#6366f1', // Indigo
  '#64748b'  // Slate
];

// Custom Tooltip component for Pie Charts
export const CustomPieTooltip = ({ active, payload, totalAmount }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const color = payload[0].fill;
    return (
      <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/90 shadow-xl text-xs z-50 min-w-44">
        <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-100">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-bold text-slate-800 truncate">{data.name}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-slate-600">
            <span>Amount:</span>
            <span className="font-mono font-bold text-slate-900">{formatCurrency(data.amount)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Distribution:</span>
            <span className="font-mono font-bold text-blue-600">{data.percentage}%</span>
          </div>
          {totalAmount > 0 && (
            <div className="flex justify-between items-center text-[10.5px] text-slate-400 pt-1 border-t border-slate-100">
              <span>Section Total:</span>
              <span className="font-mono">{formatCurrency(totalAmount)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Helper to clean up category name for callouts so it never truncates or overflows
export const formatCalloutName = (name) => {
  if (!name) return '';
  if (name.toLowerCase().includes('special lab')) return 'Special Lab';
  if (name.length > 13) return `${name.substring(0, 11)}..`;
  return name;
};

// Compute distinct, non-overlapping clean callout lines for EVERY slice
export const computeCallouts = (data, cx, cy, outerRadius) => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  const RADIAN = Math.PI / 180;
  
  const total = data.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  if (total <= 0) return [];

  // Compute angles for each slice
  let currentAngle = 0;
  const slices = data.map((item, idx) => {
    const amount = parseFloat(item.amount) || 0;
    const sweep = (amount / total) * 360;
    const midAngle = currentAngle + sweep / 2;
    currentAngle += sweep;
    const pct = item.percentage !== undefined ? item.percentage : Math.round((amount / total) * 100);
    return {
      ...item,
      index: idx,
      amount,
      pct,
      midAngle,
      isRight: Math.cos(-midAngle * RADIAN) >= 0
    };
  });

  // Handle single slice case (e.g. 100% Tuition Fee)
  if (slices.length === 1) {
    const s = slices[0];
    const angleRad = -135 * RADIAN;
    const sx = cx + (outerRadius + 1.5) * Math.cos(angleRad);
    const sy = cy + (outerRadius + 1.5) * Math.sin(angleRad);
    const targetY = Math.max(62, cy - outerRadius - 6);

    const shortName = formatCalloutName(s.name);
    const labelText = `${shortName} (100%)`;
    const textWidth = Math.min(labelText.length * 4.8 + 4, 82);
    const textX = 6;
    const lineStartX = Math.max(textX + textWidth + 4, 86);
    const elbowX = Math.max(sx - 4, lineStartX + 6);

    return [{
      ...s,
      side: 'left',
      sx,
      sy,
      lineStartX,
      elbowX,
      targetY,
      textX,
      textAnchor: 'start'
    }];
  }

  const rightSlices = slices.filter(s => s.isRight);
  const leftSlices = slices.filter(s => !s.isRight);

  // Sort right-side slices by their natural vertical position (top to bottom)
  rightSlices.sort((a, b) => {
    const ya = cy + outerRadius * Math.sin(-a.midAngle * RADIAN);
    const yb = cy + outerRadius * Math.sin(-b.midAngle * RADIAN);
    return ya - yb;
  });

  // Distribute right-side slices with clean, even vertical spacing
  const rightCount = rightSlices.length;
  const rightSpacing = rightCount > 1 ? Math.min(22, 140 / (rightCount - 1 || 1)) : 0;
  const startRightY = rightCount === 1 ? cy : Math.max(56, cy - ((rightCount - 1) * rightSpacing) / 2);

  const processedRight = rightSlices.map((s, i) => {
    const angleRad = -s.midAngle * RADIAN;
    const sx = cx + (outerRadius + 1.5) * Math.cos(angleRad);
    const sy = cy + (outerRadius + 1.5) * Math.sin(angleRad);
    const targetY = rightCount === 1 ? sy : startRightY + i * rightSpacing;
    const elbowX = cx + outerRadius + 8;
    const lineEndX = elbowX + 5;
    const textX = lineEndX + 3;

    return {
      ...s,
      side: 'right',
      sx,
      sy,
      elbowX,
      lineEndX,
      targetY,
      textX,
      textAnchor: 'start'
    };
  });

  // Sort left-side slices by natural vertical position
  leftSlices.sort((a, b) => {
    const ya = cy + outerRadius * Math.sin(-a.midAngle * RADIAN);
    const yb = cy + outerRadius * Math.sin(-b.midAngle * RADIAN);
    return ya - yb;
  });

  const leftCount = leftSlices.length;
  const leftSpacing = leftCount > 1 ? Math.min(22, 140 / (leftCount - 1 || 1)) : 0;
  const startLeftY = leftCount === 1 ? Math.max(62, cy - outerRadius - 6) : Math.max(56, cy - ((leftCount - 1) * leftSpacing) / 2);

  const processedLeft = leftSlices.map((s, i) => {
    const angleRad = -s.midAngle * RADIAN;
    const sx = cx + (outerRadius + 1.5) * Math.cos(angleRad);
    const sy = cy + (outerRadius + 1.5) * Math.sin(angleRad);
    const targetY = leftCount === 1 ? startLeftY : startLeftY + i * leftSpacing;

    const shortName = formatCalloutName(s.name);
    const labelText = `${shortName} (${s.pct}%)`;
    const textWidth = Math.min(labelText.length * 4.8 + 4, 82);
    const textX = 6;
    const lineStartX = Math.max(textX + textWidth + 4, 86);
    const elbowX = Math.max(sx - 4, lineStartX + 6);

    return {
      ...s,
      side: 'left',
      sx,
      sy,
      lineStartX,
      elbowX,
      targetY,
      textX,
      textAnchor: 'start'
    };
  });

  return [...processedRight, ...processedLeft];
};

// Render clean, elegant pointer line and text label for every fee slice (no bulky arrows, no line behind text)
export const renderSliceCallout = (props, data) => {
  const { cx, cy, outerRadius, index } = props;
  const callouts = computeCallouts(data, cx, cy, outerRadius);
  const callout = callouts.find(c => c.index === index) || callouts[index];
  if (!callout) return null;

  const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  const shortName = formatCalloutName(callout.name);

  // Clean leader line coordinates:
  // On left side: line starts AFTER text at lineStartX, extends to elbowX, then connects to slice dot (sx, sy)
  // On right side: line connects slice dot (sx, sy) to elbowX, then extends to lineEndX (stops BEFORE text)
  const linePoints = callout.side === 'left'
    ? `${callout.lineStartX},${callout.targetY} ${callout.elbowX},${callout.targetY} ${callout.sx},${callout.sy}`
    : `${callout.sx},${callout.sy} ${callout.elbowX},${callout.targetY} ${callout.lineEndX},${callout.targetY}`;

  return (
    <g key={`slice-callout-${index}`} className="select-none pointer-events-none">
      {/* Anchor dot at the slice edge */}
      <circle cx={callout.sx} cy={callout.sy} r={1.6} fill={color} />

      {/* Clean leader line - NEVER touches or runs behind text */}
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Fee Category Name & Percentage Label with clean white shadow preventing visual bleed */}
      <text
        x={callout.textX}
        y={callout.targetY}
        textAnchor={callout.textAnchor}
        dominantBaseline="central"
        fill="#1e293b"
        className="text-[9px] font-semibold font-sans tracking-tight"
        style={{
          textShadow: '0 0 2px #ffffff, 0 0 4px #ffffff'
        }}
      >
        <tspan fill="#0f172a">{shortName} </tspan>
        <tspan fill="#334155" fontWeight="700" fontFamily="monospace">
          {`(${callout.pct}%)`}
        </tspan>
      </text>
    </g>
  );
};

// Reusable single Pie Chart card component with guaranteed horizontal alignment
export const FeePieCard = ({
  title,
  subtitle,
  badgeText,
  badgeColor,
  icon: Icon,
  data,
  totalAmount,
  loading
}) => {
  const hasData = data && data.length > 0 && data.some(d => d.amount > 0);

  return (
    <motion.div
      variants={fadeInUp}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 sm:p-5 flex flex-col"
    >
      {/* Header - Fixed Height to guarantee straight horizontal alignment */}
      <div className="flex items-start justify-between min-h-[50px] pb-3 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h4>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badgeColor}`}>
          {badgeText}
        </span>
      </div>

      {/* Metric summary - Fixed Height */}
      <div className="h-[46px] mb-1">
        <span className="text-[10.5px] text-slate-400 uppercase tracking-wider font-semibold block">Total</span>
        <p className="text-xl font-bold font-mono text-slate-900 tracking-tight">
          {formatCurrency(totalAmount)}
        </p>
      </div>

      {/* Chart Canvas - Fixed Height for exact horizontal center alignment */}
      <div className="h-[250px] w-full flex items-center justify-center relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-slate-400 text-xs py-8 animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2" />
            <span>Calculating allocations...</span>
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="name"
                cx="40%"
                cy="50%"
                innerRadius={30}
                outerRadius={48}
                paddingAngle={2}
                label={(props) => renderSliceCallout(props, data)}
                labelLine={false}
                isAnimationActive={true}
                animationDuration={600}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip totalAmount={totalAmount} />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 text-xs py-8">
            <AlertCircle className="w-8 h-8 text-slate-300 mb-1.5 stroke-[1.5]" />
            <span>No data for selected filters</span>
          </div>
        )}
      </div>

      {/* Category breakdown legend list - Fixed Height across all 3 cards */}
      <div className="h-[145px] overflow-y-auto pr-1 mt-3 pt-3 border-t border-slate-100 space-y-1.5 custom-scrollbar">
        {hasData ? (
          data.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-0.5">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                />
                <span className="text-slate-600 font-medium truncate" title={cat.name}>
                  {cat.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono">
                <span className="font-bold text-slate-800">{formatCurrency(cat.amount)}</span>
                <span className="text-[10px] text-slate-400 font-semibold w-9 text-right">
                  {cat.percentage}%
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-slate-400 text-center py-1">No categorized figures</p>
        )}
      </div>
    </motion.div>
  );
};

export default FeePieCard;
