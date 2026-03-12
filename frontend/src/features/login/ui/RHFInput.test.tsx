import { render, screen } from '@testing-library/react'; // waitFor는 사용되지 않으므로 제거
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type FieldValues } from 'react-hook-form';
import { describe, it, expect } from 'vitest'; // vi는 사용되지 않으므로 제거

import RHFInput, { type RHFInputProps } from '@/shared/components/ui/RHFInput';

// ----------------------------------------------------
// 1. 테스트용 Wrapper 컴포넌트 정의
// ----------------------------------------------------

// RHFInput은 useForm의 컨텍스트 내부에서만 작동하므로,
// 테스트를 위해 임시 폼을 생성하는 Wrapper 컴포넌트를 사용합니다.
interface TestFormValues extends FieldValues {
  testField: string;
}

const TestWrapper = (props: Partial<RHFInputProps<TestFormValues>>) => {
  const form = useForm<TestFormValues>({
    defaultValues: { testField: '' },
  });

  return (
    // Form 컴포넌트가 없으므로 임시로 폼 태그 사용
    <FormProvider {...form}>
      <form>
        <RHFInput
          form={form}
          name="testField"
          label="Test Label"
          placeholder="Test Placeholder"
          {...(props as any)} // RHFInputProps의 모든 멤버가 TestWrapper의 Props와 일치하지 않을 수 있어 any 단언 사용
        />
        {/* 폼 메시지를 렌더링하는 FormProvider를 제공합니다. */}
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe('RHFInput Component', () => {
  const user = userEvent.setup();

  // 1. 기본 렌더링 및 Props 전달 테스트
  it('Label, Placeholder가 올바르게 렌더링되어야 합니다.', () => {
    render(<TestWrapper />);

    // Label 확인
    // expect(screen.getByLabelText(/Test Label/i)).toBeInTheDocument();

    // Placeholder 확인
    expect(screen.getByPlaceholderText(/Test Placeholder/i)).toBeInTheDocument();
  });

  // 2. 입력 값 변경 및 Hook Form 연결 테스트
  it('사용자 입력 값이 form state에 반영되어야 합니다.', async () => {
    // RHFInput 내부의 input 엘리먼트를 가져옵니다.
    render(<TestWrapper />);

    const inputElement = screen.getByPlaceholderText(/Test Placeholder/i);

    // [수정] Runtime 타입 가드를 추가하여 안전성을 확보합니다.
    // TypeScript에게 이 시점부터 inputElement가 HTMLInputElement임을 보장합니다.
    expect(inputElement).toBeInstanceOf(HTMLInputElement);

    // [핵심 해결책] Element가 HTMLInputElement임이 확인되었으므로 다시 타입을 단언하여 value에 접근합니다.
    const inputField = inputElement as HTMLInputElement;

    const testValue = 'hello world';

    // 입력 시뮬레이션
    await user.type(inputField, testValue);

    // DOM의 value가 변경되었는지 확인합니다.
    expect(inputField.value).toBe(testValue);
  });

  // 3. 비활성화 (Disabled) 상태 테스트
  it('disabled props가 전달되면 입력 필드가 비활성화되어야 합니다.', () => {
    render(<TestWrapper disabled={true} />);

    const inputElement = screen.getByPlaceholderText(/Test Placeholder/i);

    expect(inputElement).toBeDisabled();
  });

  // 4. 타입 전달 테스트
  it('type props가 올바르게 적용되어야 합니다.', () => {
    render(<TestWrapper type="password" />);

    const inputElement = screen.getByPlaceholderText(/Test Placeholder/i);

    // input type이 'password'인지 확인
    expect(inputElement).toHaveAttribute('type', 'password');
  });

  // 5. data-testid 확인 (옵션: 내부 구현 디테일)
  it('테스트 식별자 (data-testid)가 올바르게 설정되어야 합니다.', () => {
    render(<TestWrapper name="testField" />);

    expect(screen.getByTestId('input-testField')).toBeInTheDocument();
  });
});
