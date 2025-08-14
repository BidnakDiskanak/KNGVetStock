"use client";

import { useState, useEffect } from 'react';

/**
 * Custom hook untuk menunda (debounce) sebuah nilai.
 * Ini berguna untuk menunda eksekusi fungsi (misalnya, pencarian API)
 * sampai pengguna berhenti mengetik selama periode waktu tertentu.
 * @param value Nilai yang ingin ditunda (misalnya, dari input teks).
 * @param delay Waktu tunda dalam milidetik (ms).
 * @returns Nilai yang sudah ditunda.
 */
export function useDebounce<T>(value: T, delay: number): T {
  // State untuk menyimpan nilai yang sudah ditunda
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Atur timer untuk memperbarui nilai yang ditunda setelah 'delay'
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Bersihkan timer jika 'value' atau 'delay' berubah sebelum timer selesai.
    // Ini mencegah pembaruan nilai jika pengguna terus mengetik.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Hanya jalankan ulang efek jika 'value' atau 'delay' berubah

  return debouncedValue;
}
