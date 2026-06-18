import { Activity } from 'lucide-react';
import { renderGlossaryText } from '@/components/glossary/GlossaryText';
import type { CivicServiceRecord } from '@/lib/command-center/actionTypes';

type ParsedRecordCardProps = {
  record: CivicServiceRecord;
};

export function ParsedRecordCard({ record }: ParsedRecordCardProps) {
  const hasBadCoordinates = record.coordinates === '0, 0';

  return (
    <section className="border border-cyan-200/20 bg-cyan-300/10 p-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
        <Activity size={15} />
        Parsed Record
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <RecordField label="Category" value={record.category} />
        <RecordField label="Status" value={record.status} />
        <RecordField label="Outcome" value={record.outcome} />
        <RecordField label="Request ID" value={record.serviceRequest} mono />
        <RecordField label="Location" value={record.location} wide />
        <RecordField label="Reported" value={record.reported} />
        <RecordField label="Coordinates" value={record.coordinates} warning={hasBadCoordinates} />
      </div>
      {hasBadCoordinates && (
        <p className="mt-3 border border-amber-200/30 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-50">
          Coordinates are missing or failed to geocode. Use the address and request ID for lookup.
        </p>
      )}
    </section>
  );
}

function RecordField({
  label,
  value,
  mono = false,
  warning = false,
  wide = false
}: {
  label: string;
  value: string;
  mono?: boolean;
  warning?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`border px-3 py-2 ${wide ? 'sm:col-span-2' : ''} ${
      warning ? 'border-amber-200/30 bg-amber-300/10' : 'border-white/10 bg-[#071016]'
    }`}>
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-black text-white ${mono ? 'font-mono' : ''}`}>
        {renderGlossaryText(value)}
      </p>
    </div>
  );
}
