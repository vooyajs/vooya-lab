//! Pre-expanded wasm-bindgen ABI scaffold for the constrained Gate 1.97 probe.
//!
//! The editable browser source supplies `vooya_user_answer`; this fixed rlib
//! supplies the reviewed public wrapper and wasm-bindgen 0.2.115 metadata.
//! These bytes were generated from the equivalent `#[wasm_bindgen]` function,
//! not inferred from user source. Changing the signature or wasm-bindgen
//! version requires regenerating and reviewing the whole scaffold.

unsafe extern "C" {
    fn vooya_user_answer(value: i32) -> i32;
}

#[link(wasm_import_module = "__wbindgen_placeholder__")]
unsafe extern "C" {
    fn __wbindgen_describe(value: u32);
}

#[unsafe(export_name = "vooya_gate_two_answer")]
pub unsafe extern "C" fn vooya_gate_two_answer(value: i32) -> i32 {
    unsafe { vooya_user_answer(value) }
}

#[unsafe(no_mangle)]
pub extern "C" fn __externref_table_alloc() -> u32 {
    0
}

#[unsafe(no_mangle)]
pub extern "C" fn __externref_table_dealloc(_: u32) {}

#[unsafe(no_mangle)]
pub extern "C" fn __wbindgen_describe_vooya_gate_two_answer() {
    for value in [13, 0, 1, 4, 4, 4] {
        unsafe { __wbindgen_describe(value) };
    }
}

const fn flat_len<T, const SIZE: usize>(slices: [&[T]; SIZE]) -> usize {
    let mut len = 0;
    let mut index = 0;
    while index < slices.len() {
        len += slices[index].len();
        index += 1;
    }
    len
}

const fn flat_byte_slices<const RESULT_LEN: usize, const SIZE: usize>(
    slices: [&[u8]; SIZE],
) -> [u8; RESULT_LEN] {
    let mut result = [0; RESULT_LEN];
    let mut slice_index = 0;
    let mut result_offset = 0;
    while slice_index < slices.len() {
        let mut index = 0;
        let slice = slices[slice_index];
        while index < slice.len() {
            result[result_offset] = slice[index];
            index += 1;
            result_offset += 1;
        }
        slice_index += 1;
    }
    result
}

const ENCODED_BYTES: &[u8] = {
    const CHUNKS: [&[u8]; 1] = [b"\x01\0\0\0\x01\x05value\0\0\0\0\x15vooya_gate_two_answer\x01\x01\0\0\0\0\x01\x01\0\0\0\0\0\0\0\0'vooya-bindgen-scaffold-e777d9d6de364e90\0\0"];
    const CHUNK_LEN: usize = flat_len(CHUNKS);
    const FLAT: [u8; CHUNK_LEN] = flat_byte_slices(CHUNKS);
    const LEN: [u8; 4] = (CHUNK_LEN as u32).to_le_bytes();
    const ALL: [u8; CHUNK_LEN + 4] = flat_byte_slices([&LEN, &FLAT]);
    &ALL
};
const PREFIX: &[u8] = b"0\0\0\0{\"schema_version\":\"0.2.115\",\"version\":\"0.2.115\"}";
const SECTION_LEN: usize = PREFIX.len() + ENCODED_BYTES.len();

#[unsafe(link_section = "__wasm_bindgen_unstable")]
#[used]
static GENERATED: [u8; SECTION_LEN] = flat_byte_slices([PREFIX, ENCODED_BYTES]);

#[inline(never)]
pub fn link() {}
