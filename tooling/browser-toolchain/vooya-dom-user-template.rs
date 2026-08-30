/// The editable Gate 2 unit. The component scaffold imports this symbol.
#[unsafe(no_mangle)]
pub extern "C" fn vooya_user_answer(value: i32) -> i32 {
    value + 2
}

/// Keeps the fixed component scaffold reachable from the final cdylib.
#[unsafe(no_mangle)]
pub extern "C" fn vooya_gate_two_probe() -> i32 {
    vooya_gate_two_dom_scaffold::link();
    vooya_user_answer(40)
}
