import React from "react";

interface RobotVerificationProps {
  verification?: {
    passed: boolean;
    details: string;
    verifier: string;
    verifiedAt?: number;
    criteriaMet?: string[];
    criteriaUnmet?: string[];
  };
  className?: string;
}

export function RobotVerification({
  verification,
  className = "",
}: RobotVerificationProps) {
  if (!verification) {
    return (
      <div className={`p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-500 italic ${className}`}>
        Pending outcome or milestone verification.
      </div>
    );
  }

  return (
    <div className={`space-y-3 p-4 rounded-lg bg-slate-900/70 border border-slate-800/80 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">
            {verification.passed ? "🛡️" : "⚠️"}
          </span>
          <span className="text-xs font-semibold text-slate-200">
            {verification.passed ? "Verification Passed" : "Verification Failed"}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
            verification.passed
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
          }`}
        >
          {verification.passed ? "PASSED" : "FAILED"}
        </span>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-800">
        {verification.details}
      </p>

      {verification.criteriaMet && verification.criteriaMet.length > 0 && (
        <div>
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            Criteria Verified ({verification.criteriaMet.length})
          </span>
          <ul className="space-y-1">
            {verification.criteriaMet.map((c, idx) => (
              <li
                key={idx}
                className="text-xs text-emerald-300 flex items-start gap-1.5 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30"
              >
                <span>✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {verification.criteriaUnmet && verification.criteriaUnmet.length > 0 && (
        <div>
          <span className="text-[11px] font-medium text-rose-400 block mb-1">
            Criteria Unmet ({verification.criteriaUnmet.length})
          </span>
          <ul className="space-y-1">
            {verification.criteriaUnmet.map((c, idx) => (
              <li
                key={idx}
                className="text-xs text-rose-300 flex items-start gap-1.5 bg-rose-950/20 px-2 py-1 rounded border border-rose-900/30"
              >
                <span>✗</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
        <span>Verified by: {verification.verifier}</span>
        {verification.verifiedAt && (
          <span>{new Date(verification.verifiedAt).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}
