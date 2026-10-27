# 프로젝트 식별
사용자 결정(2026-10-27, Checkpoint 5): `.env.local`의 NVIDIA_API_KEY를 서버 환경변수로 읽어 DeepSeek V4.1 Flash의 로컬 실제 생성·검증을 허용했다. VERCEL_OIDC_TOKEN 및 환경 파일은 보존하고 비밀값을 출력하지 않는다. Vercel 공개 서비스의 AI는 비활성 상태로 유지하며 이번 단계에서는 재배포하지 않는다.
- 앱: 평어담 (pyeoneo-studio)
- GitHub 공개 저장소: https://github.com/subsubT/pyeoneo-studio
- Production: https://pyeoneo-studio.vercel.app
- Vercel scope: subsub-tschool
- Vercel projectId: prj_osDdLkgyiAomzS03J2GFM0c2bVB4
- Vercel orgId: team_JKZ7B5OCf27pFKiNlhvSVuE4
- Supabase project ref: 해당 없음 (교육 자료·결과 서버 저장 없음)

배포 전 `.vercel/project.json`과 실제 project inspect를 대조한다. 다른 프로젝트를 수정하지 않는다. 비밀값·.env·.vercel·교육 원본·학생 자료를 Git에 넣지 않는다.

로컬 실제 AI 시험은 승인된 범위다. 로컬 개발 모드와 명시적 LOCAL_AI_ENABLED=true에서만 켠다. NODE_ENV=production 또는 VERCEL 환경에서는 항상 차단한다. NVIDIA 무료 체험의 공개 운영 연결은 이번 승인 범위 밖이며 docs/AI-OPERATIONS.md의 남은 결정을 확인한다. 모의 검사와 실제 모델 시험 결과를 구분한다.

실제 활동의 사실성·핵심 의미 보존이 최우선이다. 계획과 평가 수준은 수행 사실의 근거가 아니다. 새 문장만 금지 어휘를 검사하고 원본 예시는 보존한다. 승인한 문장만 최종 결과에 넣는다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
