import { SYSTEM_PROMPT } from '@/lib/bot-knowledge';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as {
      messages: Array<{ role: 'user' | 'model'; content: string }>;
    };

    if (!messages || messages.length === 0) {
      return Response.json({ error: 'Messages are required' }, { status: 400 });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return Response.json(
        { error: 'DEEPSEEK_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const apiMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map((msg) => ({
        role: (msg.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: msg.content,
      })),
    ];

    // Tie upstream request lifetime to the client connection.
    // When the browser navigates away / closes the SSE connection, Next.js will abort `request.signal`.
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      signal: request.signal,
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`DeepSeek API error: ${res.status} ${err}`);
    }

    if (!res.body) {
      throw new Error('No response body from DeepSeek');
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = res.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  try {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                    );
                  } catch (e) {
                    // Client disconnected / stream canceled.
                    // Stop processing without surfacing a noisy error.
                    if (e instanceof DOMException && e.name === 'AbortError') return;
                    if (e instanceof Error && e.name === 'AbortError') return;
                    throw e;
                  }
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
          try {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return;
            if (e instanceof Error && e.name === 'AbortError') return;
            throw e;
          }
          try {
            controller.close();
          } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return;
            if (e instanceof Error && e.name === 'AbortError') return;
            throw e;
          }
        } catch (err) {
          // If the client disconnected, this is an expected abort.
          if (err instanceof DOMException && err.name === 'AbortError') return;
          if (err instanceof Error && err.name === 'AbortError') return;
          const errorMessage =
            err instanceof Error ? err.message : 'Stream error';
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
            );
          } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return;
            if (e instanceof Error && e.name === 'AbortError') return;
            throw e;
          }
          try {
            controller.close();
          } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return;
            if (e instanceof Error && e.name === 'AbortError') return;
            throw e;
          }
        }
      },
      async cancel() {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
