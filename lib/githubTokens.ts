// GitHub Token Rotation — 3 PATs cycling on every call
const tokens = [
  process.env.GITHUB_TOKEN_1,
  process.env.GITHUB_TOKEN_2,
  process.env.GITHUB_TOKEN_3,
].filter(Boolean) as string[];

let callCount = 0;

export function getNextToken(): string {
  if (tokens.length === 0) {
    throw new Error('No GitHub tokens configured');
  }
  const token = tokens[callCount % tokens.length];
  callCount++;
  return token;
}

export async function githubFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = getNextToken();
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options?.headers,
    },
  });
}
