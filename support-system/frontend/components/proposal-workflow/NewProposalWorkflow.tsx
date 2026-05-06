"use client";

import { useCallback, useId, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  type CompanyProfileDraft,
  type ExtractedNoticeProfile,
  type NoticeDocumentFile,
  type ProposalGenerationOptions,
  defaultCompanyProfileDraft,
  defaultProposalGenerationOptions,
  emptyExtractedNoticeProfile,
} from "../../lib/proposal-workflow/types";
import { NOTICE_FILE_ACCEPT, formatBytes, isAllowedNoticeFile } from "../../lib/proposal-workflow/file-utils";
import { cardSurface, btnPrimary, btnSecondary, inputClass, labelClass } from "../dashboard/ui-classes";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${cardSurface} p-5 sm:p-6`}>
      <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function NewProposalWorkflow() {
  const searchParams = useSearchParams();
  const programIdParam = searchParams.get("programId");
  const uploadId = useId();

  const [files, setFiles] = useState<NoticeDocumentFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedNoticeProfile>(() => emptyExtractedNoticeProfile());
  const [company, setCompany] = useState<CompanyProfileDraft>(() => defaultCompanyProfileDraft());
  const [options, setOptions] = useState<ProposalGenerationOptions>(() => defaultProposalGenerationOptions());

  const hasFiles = files.length > 0;

  const onFilesSelected = useCallback((list: FileList | null) => {
    setUploadError(null);
    if (!list?.length) return;
    const next: NoticeDocumentFile[] = [];
    for (const file of Array.from(list)) {
      if (!isAllowedNoticeFile(file)) {
        setUploadError(`${file.name}: 지원 형식은 PDF, HWP, DOC/DOCX, TXT 입니다.`);
        continue;
      }
      next.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
      });
    }
    if (next.length) setFiles((prev) => [...prev, ...next]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const mockAnalyzeDisabledReason = useMemo(() => {
    if (!hasFiles) return "공고문 파일을 먼저 업로드하세요.";
    return null;
  }, [hasFiles]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      {programIdParam ? (
        <div
          className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          <p className="font-medium">참조 ID (추후 연동)</p>
          <p className="mt-1 text-amber-100/80">
            URL에 전달된 programId=<span className="tabular-nums">{programIdParam}</span> 는 아직 백엔드와 연결되지
            않았습니다. 제안서 워크플로우는 공고문 업로드를 기본으로 하며, 수집 공고와의 자동 매핑은 이후 릴리스에서
            제공합니다.
          </p>
        </div>
      ) : null}

      <SectionCard
        title="1. 공고문 업로드"
        description="기본 시작점입니다. PDF, HWP, DOCX, TXT 등 공고 원문을 올리면 이후 단계에서 분석·추출합니다. (현재는 UI만)"
      >
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center">
          <input
            id={uploadId}
            type="file"
            className="sr-only"
            accept={NOTICE_FILE_ACCEPT}
            multiple
            onChange={(e) => onFilesSelected(e.target.files)}
          />
          <label
            htmlFor={uploadId}
            className="inline-flex cursor-pointer flex-col items-center gap-2 text-sm text-zinc-400"
          >
            <span className="rounded-lg border border-white/10 bg-[#141414] px-4 py-2 text-zinc-200 transition hover:border-white/20">
              파일 선택
            </span>
            <span>또는 이 영역으로 드래그 앤 드롭 (브라우저 기본 동작 — 추후 보강)</span>
          </label>
        </div>
        {uploadError ? <p className="mt-2 text-sm text-red-300">{uploadError}</p> : null}
        {files.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-[#141414] px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate text-zinc-200">{f.name}</span>
                <span className="shrink-0 tabular-nums text-zinc-500">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="shrink-0 text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                >
                  제거
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">업로드된 파일이 없습니다.</p>
        )}
      </SectionCard>

      <SectionCard
        title="추출 필드 (미리보기)"
        description="AI 파이프라인 연결 후 자동 채워집니다. 지금은 편집해 목업 데이터로 사용할 수 있습니다."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["title", "사업명"],
              ["supportTarget", "지원대상"],
              ["supportScale", "지원규모"],
              ["applicationPeriod", "신청기간"],
              ["requiredDocuments", "제출서류"],
              ["evaluationCriteria", "평가기준"],
            ] as const
          ).map(([key, lab]) => (
            <label key={key} className={key === "requiredDocuments" || key === "evaluationCriteria" ? "sm:col-span-2" : ""}>
              <span className={labelClass}>{lab}</span>
              {key === "requiredDocuments" || key === "evaluationCriteria" ? (
                <textarea
                  className={`${inputClass} mt-1.5 min-h-[88px] resize-y py-2`}
                  value={extracted[key]}
                  onChange={(e) => setExtracted((s) => ({ ...s, [key]: e.target.value }))}
                  placeholder="업로드 분석 후 자동 입력"
                />
              ) : (
                <input
                  className={`${inputClass} mt-1.5`}
                  value={extracted[key]}
                  onChange={(e) => setExtracted((s) => ({ ...s, [key]: e.target.value }))}
                  placeholder="업로드 분석 후 자동 입력"
                />
              )}
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="2. 다른 경로 (준비 중)"
        description="수집 공고 DB와의 연계는 제안서 워크플로우와 독립적으로 설계됩니다."
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" disabled className={`${btnSecondary} cursor-not-allowed opacity-50`}>
            공고 탐색에서 불러오기
          </button>
          <span className="self-center text-xs text-zinc-500">수집 API 연동 전 — 버튼 비활성화</span>
        </div>
      </SectionCard>

      <SectionCard title="3. 기업 정보" description="제안서에 반영할 기업 개요입니다. 저장 API는 추후 연결합니다.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>회사명</span>
            <input
              className={`${inputClass} mt-1.5`}
              value={company.companyName}
              onChange={(e) => setCompany((s) => ({ ...s, companyName: e.target.value }))}
            />
          </label>
          <label>
            <span className={labelClass}>사업자등록번호</span>
            <input
              className={`${inputClass} mt-1.5`}
              value={company.businessRegNo}
              onChange={(e) => setCompany((s) => ({ ...s, businessRegNo: e.target.value }))}
            />
          </label>
          <label>
            <span className={labelClass}>대표자</span>
            <input
              className={`${inputClass} mt-1.5`}
              value={company.ceoName}
              onChange={(e) => setCompany((s) => ({ ...s, ceoName: e.target.value }))}
            />
          </label>
          <label>
            <span className={labelClass}>업종</span>
            <input
              className={`${inputClass} mt-1.5`}
              value={company.industry}
              onChange={(e) => setCompany((s) => ({ ...s, industry: e.target.value }))}
            />
          </label>
          <label>
            <span className={labelClass}>임직원 수 (명)</span>
            <input
              className={`${inputClass} mt-1.5`}
              value={company.employeeCount}
              onChange={(e) => setCompany((s) => ({ ...s, employeeCount: e.target.value }))}
            />
          </label>
          <label>
            <span className={labelClass}>매출 규모 (억 원)</span>
            <input
              className={`${inputClass} mt-1.5`}
              value={company.annualRevenue}
              onChange={(e) => setCompany((s) => ({ ...s, annualRevenue: e.target.value }))}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>주소</span>
            <input
              className={`${inputClass} mt-1.5`}
              value={company.address}
              onChange={(e) => setCompany((s) => ({ ...s, address: e.target.value }))}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>기업 요약</span>
            <textarea
              className={`${inputClass} mt-1.5 min-h-[100px] resize-y py-2`}
              value={company.summary}
              onChange={(e) => setCompany((s) => ({ ...s, summary: e.target.value }))}
              placeholder="핵심 사업·역량·실적 요약"
            />
          </label>
        </div>
        <div className="mt-4">
          <button type="button" disabled className={`${btnSecondary} cursor-not-allowed opacity-50`}>
            저장된 기업 프로필 불러오기
          </button>
          <p className="mt-1 text-xs text-zinc-500">기업 정보 페이지·API 연동 후 활성화 예정</p>
        </div>
      </SectionCard>

      <SectionCard title="4. 생성 옵션" description="LLM 호출 단계에서 사용할 옵션입니다. (현재는 상태만 유지)">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>톤</span>
            <select
              className={`${inputClass} mt-1.5`}
              value={options.tone}
              onChange={(e) =>
                setOptions((s) => ({ ...s, tone: e.target.value as ProposalGenerationOptions["tone"] }))
              }
            >
              <option value="formal">공식·정중</option>
              <option value="balanced">균형</option>
              <option value="concise">간결</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>분량</span>
            <select
              className={`${inputClass} mt-1.5`}
              value={options.targetPages}
              onChange={(e) =>
                setOptions((s) => ({
                  ...s,
                  targetPages: e.target.value as ProposalGenerationOptions["targetPages"],
                }))
              }
            >
              <option value="short">짧게 (요약 중심)</option>
              <option value="standard">표준</option>
              <option value="detailed">상세</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>언어</span>
            <select
              className={`${inputClass} mt-1.5`}
              value={options.language}
              onChange={(e) =>
                setOptions((s) => ({ ...s, language: e.target.value as ProposalGenerationOptions["language"] }))
              }
            >
              <option value="ko">한국어</option>
              <option value="ko_en_summary">한국어 + 영문 요약</option>
            </select>
          </label>
        </div>
        <fieldset className="mt-4 space-y-2">
          <legend className={`${labelClass} mb-2`}>포함 섹션</legend>
          {(
            [
              ["includeBudget", "예산·사업비"],
              ["includeTimeline", "일정·로드맵"],
              ["includeRiskMitigation", "리스크·대응"],
            ] as const
          ).map(([key, lab]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                className="rounded border-white/20 bg-[#141414] text-zinc-100"
                checked={options[key]}
                onChange={(e) => setOptions((s) => ({ ...s, [key]: e.target.checked }))}
              />
              {lab}
            </label>
          ))}
        </fieldset>
      </SectionCard>

      <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:justify-end">
        <button type="button" disabled className={`${btnSecondary} cursor-not-allowed opacity-50`}>
          임시 저장 (준비 중)
        </button>
        <button
          type="button"
          disabled
          title={mockAnalyzeDisabledReason ?? undefined}
          className={`${btnPrimary} cursor-not-allowed opacity-50`}
        >
          공고문 분석 실행 (준비 중)
        </button>
      </div>
      {mockAnalyzeDisabledReason ? (
        <p className="text-center text-xs text-zinc-500 sm:text-right">{mockAnalyzeDisabledReason}</p>
      ) : null}
    </div>
  );
}
