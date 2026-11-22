'use client';
export default function ReportError({reset}:{reset:()=>void}) {return <main className="mx-auto max-w-3xl p-8"><h1 className="text-2xl font-black">Ranked report temporarily unavailable</h1><button onClick={reset} className="mt-4 min-h-11 rounded-lg bg-violet-700 px-4 text-white">Try again</button></main>}
