import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounceInputChange } from "../../src/ui/debounceInputChange";

describe("debounceInputChange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes onChange after the delay and clears the timer", () => {
    const onChange = vi.fn();
    const debounced = debounceInputChange(onChange, 100);

    debounced();
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("reschedules when called repeatedly before the delay elapses", () => {
    const onChange = vi.fn();
    const debounced = debounceInputChange(onChange, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
