/**
 * 제안서 작성 워크플로우 전용 타입.
 * 수집 공고(SupportProgram) 스키마와 분리 — API 연동·임베딩·FAISS 단계에서 확장.
 */

export type NoticeDocumentFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
};

/** 공고문에서 추출될 필드 (AI 파이프라인 연동 전 — UI·상태만) */
export type ExtractedNoticeProfile = {
  title: string;
  supportTarget: string;
  supportScale: string;
  applicationPeriod: string;
  requiredDocuments: string;
  evaluationCriteria: string;
};

export const emptyExtractedNoticeProfile = (): ExtractedNoticeProfile => ({
  title: "",
  supportTarget: "",
  supportScale: "",
  applicationPeriod: "",
  requiredDocuments: "",
  evaluationCriteria: "",
});

/** 사용자 기업 프로필 초안 (DB 저장 전 클라이언트 상태) */
export type CompanyProfileDraft = {
  companyName: string;
  businessRegNo: string;
  ceoName: string;
  industry: string;
  employeeCount: string;
  annualRevenue: string;
  address: string;
  summary: string;
};

export const defaultCompanyProfileDraft = (): CompanyProfileDraft => ({
  companyName: "",
  businessRegNo: "",
  ceoName: "",
  industry: "",
  employeeCount: "",
  annualRevenue: "",
  address: "",
  summary: "",
});

export type ProposalTone = "formal" | "balanced" | "concise";

export type ProposalGenerationOptions = {
  tone: ProposalTone;
  targetPages: "short" | "standard" | "detailed";
  includeBudget: boolean;
  includeTimeline: boolean;
  includeRiskMitigation: boolean;
  language: "ko" | "ko_en_summary";
};

export const defaultProposalGenerationOptions = (): ProposalGenerationOptions => ({
  tone: "formal",
  targetPages: "standard",
  includeBudget: true,
  includeTimeline: true,
  includeRiskMitigation: false,
  language: "ko",
});

/** 수집 공고 ID 등 외부 참조(추후 ‘불러오기’용) — 워크플로우 상태에만 보관 */
export type ProposalSourceRef = {
  kind: "upload" | "explore_program" | "url" | "program_id";
  /** 예: 수집 DB의 program id — 현 단계에서는 조회하지 않음 */
  programId?: string;
};
