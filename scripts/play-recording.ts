import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
/** デバッグ中に決着したプレイだけを、固定ディレクトリへ記録する。 */
export function playRecording(): Plugin {
    return {
        name: 'play-recording',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use('/__debug/play-records', async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405).end();
                    return;
                }
                const origin = request.headers.origin;
                if (!origin || new URL(origin).host !== request.headers.host) {
                    response.writeHead(403).end('同じ開発画面から記録してください');
                    return;
                }
                try {
                    const chunks: Buffer[] = [];
                    let size = 0;
                    for await (const chunk of request) {
                        size += chunk.length;
                        if (size > 16 * 1024 * 1024) {
                            response.writeHead(413).end('記録が大きすぎます');
                            return;
                        }
                        chunks.push(Buffer.from(chunk));
                    }
                    const record = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                    if (
                        record.version !== 1 ||
                        !record.final ||
                        record.final.outcome === 'playing' ||
                        !Array.isArray(record.frames)
                    ) {
                        response.writeHead(400).end('決着したプレイ記録ではありません');
                        return;
                    }
                    const directory = fileURLToPath(
                        new URL('../tmp/play-records/', import.meta.url),
                    );
                    await mkdir(directory, { recursive: true });
                    const file = `${Date.now()}-${randomUUID()}.json`;
                    await writeFile(directory + file, JSON.stringify(record), 'utf8');
                    response
                        .writeHead(201, { 'Content-Type': 'application/json' })
                        .end(JSON.stringify({ file }));
                } catch (error) {
                    response
                        .writeHead(500)
                        .end(error instanceof Error ? error.message : String(error));
                }
            });
        },
    };
}
