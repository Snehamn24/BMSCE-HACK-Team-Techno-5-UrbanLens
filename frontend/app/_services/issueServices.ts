import { getRequest, postRequest } from "./api";

export const IssuesService = {
  getAllIssues: async () => {
    return await getRequest("/issues");
  },

  reportIssue: async (issue: any) => {
    return await postRequest("/issues", issue);
  },
};