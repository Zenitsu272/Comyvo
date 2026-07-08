"use client";

import { DecodedStudent } from "@/lib/auth";

interface DecodedCardProps {
  info: DecodedStudent;
}

export default function DecodedStudentCard({ info }: DecodedCardProps) {
  if (!info.isValid) return null;

  return (
    <div className="decoded-card" role="status" aria-label="Decoded student information">
      <div className="decoded-header">
        <span className="decoded-check">✓</span>
        <div>
          <strong>Amrita student detected</strong>
          <span>{info.fullRollNumber}</span>
        </div>
      </div>

      <div className="decoded-grid">
        <div className="decoded-field">
          <span>Campus</span>
          <strong>{info.campus ?? info.campusCode}</strong>
        </div>
        <div className="decoded-field">
          <span>Department</span>
          <strong>{info.department ?? info.departmentCode}</strong>
        </div>
        <div className="decoded-field">
          <span>Program</span>
          <strong>{info.program ?? "—"}</strong>
        </div>
        <div className="decoded-field">
          <span>Batch</span>
          <strong>{info.batchLabel ?? `${info.yearOfJoining}`}</strong>
        </div>
        <div className="decoded-field">
          <span>Roll No.</span>
          <strong>{info.rollNumber ?? "—"}</strong>
        </div>
        <div className="decoded-field">
          <span>Course</span>
          <strong>{info.course?.split(" ")[0] ?? "—"}</strong>
        </div>
      </div>

      <p className="decoded-note">
        This info will be pre-filled in your profile. You can change it after signing up.
      </p>
    </div>
  );
}
