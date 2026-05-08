
정부지원사업 공고 조회 데이터를 기반으로 확장 중인 사업제안서 생성 SaaS 플랫폼입니다.

기존 공고 수집·조회·통계 기능은 데이터 소스 레이어로 유지하며, 신규 기능은 공고문 업로드, 기업 정보 입력, AI 기반 제안서 생성 및 관리 워크플로우 중심으로 확장합니다.

## 주요 기능

- 정부지원사업 공고 수집 및 조회
- 공고 카테고리/출처/접수상태 통계 대시보드
- 공고문 파일 업로드 기반 제안서 작성 준비
- 기업 정보 입력 및 관리
- 제안서 생성 워크플로우
- 향후 OpenAI API 기반 제안서 초안 생성
- 향후 FAISS 기반 공고문/기업자료 벡터 검색

## 기술 스택

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- Recharts

### Backend
- FastAPI
- Python
- MySQL

### AI / Search 예정
- OpenAI API
- sentence-transformers
- FAISS

## 메뉴 구조

1. 대시보드
2. 제안서 작성
3. 내 제안서
4. 기업 정보
5. 공고 탐색
6. AI 분석
7. 설정

## 프로젝트 방향

본 프로젝트는 단순한 정부지원사업 조회 시스템이 아니라, 기업이 공고문과 기업 정보를 기반으로 사업제안서를 생성하고 관리할 수 있는 SaaS 플랫폼을 목표로 합니다.

## 실행 방법

### Backend

```bash
cd backend
uvicorn main:app --reload