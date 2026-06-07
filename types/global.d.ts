// 프로젝트 전역 타입 참조.
// - expo/types: 정적 에셋(*.png 등) 및 CSS(side-effect import) 모듈 선언 제공
// - jest: 테스트 파일의 describe/it/expect 전역 제공
// (expo-env.d.ts 는 expo 가 자동 생성하지만 gitignore 되므로, 커밋 가능한 참조를 둔다)
/// <reference types="expo/types" />
/// <reference types="jest" />
