export type RequestContext = {
  request: Request;
};

export type ClerkAuthContext = {
  auth: {
    getToken: (params?: { template: string }) => Promise<string | null>;
  };
};
