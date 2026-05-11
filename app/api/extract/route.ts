import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const filename = req.headers.get('x-filename') || 'upload';
    const buf = await req.arrayBuffer();
    const lower = filename.toLowerCase();

    if (lower.endsWith('.pdf')) {
      // Use pdf-parse on the server to reliably extract text from PDFs
      // dynamic import so the route doesn't crash if package missing
      // @ts-ignore
      const pdfparseModule: any = await import('pdf-parse');
      const pdfparse = pdfparseModule && (pdfparseModule.default || pdfparseModule);
      console.log('pdfparseModule keys', pdfparseModule && Object.keys(pdfparseModule));
      console.log('typeof pdfparse', typeof pdfparse);
      const uint8 = new Uint8Array(buf);
      const parsed = await pdfparse(uint8);
      const text = (parsed && parsed.text) ? parsed.text : '';
      return NextResponse.json({ text: text.trim(), filename });
    }

    if (lower.endsWith('.docx')) {
      // @ts-ignore
      const mammoth: any = await import('mammoth');
      const arrayBuffer = buf;
      const { value } = await mammoth.extractRawText({ arrayBuffer });
      return NextResponse.json({ text: (value || '').trim(), filename });
    }

    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  } catch (err) {
    console.error('extract route error', err);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
