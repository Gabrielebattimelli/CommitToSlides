import { Commit } from '../types';

const BASE_URL = 'https://api.github.com';

export const fetchCommits = async (
  owner: string,
  repo: string,
  token: string,
  since: string,
  until: string
): Promise<Commit[]> => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };

  const cleanToken = token ? token.trim() : '';
  if (cleanToken) {
    headers.Authorization = `Bearer ${cleanToken}`;
  }

  // Fetch list of commits (up to 100 to capture enough history)
  const response = await fetch(
    `${BASE_URL}/repos/${owner}/${repo}/commits?since=${since}&until=${until}&per_page=100`,
    { headers }
  );

  if (!response.ok) {
    let errorMessage = 'Failed to fetch commits';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }

    if (response.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" not found. Please check visibility and spelling.`);
    }

    if (errorMessage.includes('Resource not accessible by personal access token')) {
      throw new Error('The provided GitHub Token cannot access this repository. Check your token scopes, or try removing the token if the repository is public.');
    }

    if (response.status === 401 || errorMessage.toLowerCase().includes('bad credentials')) {
      throw new Error('GitHub Authentication failed. Please check that your token is valid.');
    }

    throw new Error(errorMessage);
  }

  const commits: Commit[] = await response.json();

  // Fetch details for up to the latest 50 commits to avoid rate limits but get deep context
  // This is significantly increased from 20 to allow better analysis
  const detailedCommits = await Promise.all(
    commits.slice(0, 50).map(async (commit) => {
      const detailUrl = `${BASE_URL}/repos/${owner}/${repo}/commits/${commit.sha}`;
      
      try {
        const detailRes = await fetch(detailUrl, { headers });
        if (detailRes.ok) {
          return await detailRes.json();
        }
      } catch (e) {
        console.warn('Failed to fetch commit details', e);
      }
      return commit; 
    })
  );

  return detailedCommits;
};