import { describe, expect, it } from "vitest";
import {
  classifyUser,
  effectiveNickname,
  isOrphanTestPoll,
} from "./policy.mjs";

const opts = { emailDomain: "example.com" };
const harnessUser = {
  id: "11111111-2222-3333-4444-555555555555",
  email: "test_rls_abc123_host@example.com",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { nickname: "test_host_abc123" },
};

describe("테스트 계정 판정 (T8.18)", () => {
  it("하네스가 만든 계정은 세 겹 모두 맞아 삭제 대상", () => {
    expect(classifyUser(harnessUser, "test_host_abc123", opts).kind).toBe(
      "target",
    );
  });

  it("E2E가 닉네임을 test_ 다른 값으로 바꿔도 대상", () => {
    expect(classifyUser(harnessUser, "test_새이름", opts).kind).toBe("target");
  });

  it("프로필이 없으면 가입 메타데이터 닉네임으로 본다", () => {
    expect(classifyUser(harnessUser, null, opts).kind).toBe("target");
    expect(effectiveNickname(harnessUser, "")).toBe("test_host_abc123");
  });

  it("실제 사용자가 닉네임을 test_로 지어도 지우지 않는다", () => {
    const real = {
      id: "a",
      email: null,
      app_metadata: { provider: "custom:kakao", providers: ["custom:kakao"] },
      user_metadata: { nickname: "점심러" },
    };
    const v = classifyUser(real, "test_장난", opts);
    expect(v.kind).toBe("review");
    expect(v.checks).toEqual({ nickname: true, email: false, provider: false });
  });

  it("테스트 이메일이어도 닉네임이 test_가 아니면 확인만", () => {
    expect(classifyUser(harnessUser, "점심손님 4821", opts).kind).toBe(
      "review",
    );
  });

  it("다른 도메인, 다른 접두 이메일은 대상이 아니다", () => {
    const other = { ...harnessUser, email: "test_rls_abc@gmail.com" };
    expect(classifyUser(other, "test_x", opts).kind).toBe("review");
    const noPrefix = { ...harnessUser, email: "test_abc@example.com" };
    expect(classifyUser(noPrefix, "test_x", opts).kind).toBe("review");
  });

  it("email provider에 소셜 provider가 붙은 계정은 대상이 아니다", () => {
    const linked = {
      ...harnessUser,
      app_metadata: { provider: "email", providers: ["email", "google"] },
    };
    expect(classifyUser(linked, "test_x", opts).kind).toBe("review");
  });

  it("아무것도 맞지 않으면 건너뜀", () => {
    const real = {
      id: "b",
      app_metadata: { provider: "google", providers: ["google"] },
    };
    expect(classifyUser(real, "점심러", opts).kind).toBe("skip");
  });
});

describe("방장 없는 테스트 투표방", () => {
  it("host_id null + test_ 제목만", () => {
    expect(isOrphanTestPoll({ host_id: null, title: "test_흐름ab" })).toBe(
      true,
    );
    expect(isOrphanTestPoll({ host_id: "u", title: "test_흐름ab" })).toBe(
      false,
    );
    expect(isOrphanTestPoll({ host_id: null, title: "월요일 점심" })).toBe(
      false,
    );
  });
});
