const repository = require("./adminRepository");

const pagination = (query) => {
  const parsedLimit = Number.parseInt(query.limit, 10);
  const parsedPage = Number.parseInt(query.page, 10);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 100)
    : 20;
  const page = Number.isFinite(parsedPage) ? Math.max(parsedPage, 1) : 1;

  return {
    limit,
    page,
    offset: (page - 1) * limit,
  };
};

const withPagination = async (query, fetcher) => {
  const pageInfo = pagination(query);
  const result = await fetcher({ ...pageInfo, ...query });
  return {
    ...result,
    pagination: {
      page: pageInfo.page,
      limit: pageInfo.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / pageInfo.limit),
    },
  };
};

module.exports = {
  getDashboardStats: () => repository.getDashboardStats(),
  listUsers: (query) => withPagination(query, repository.listUsers),
  listRides: (query) => withPagination(query, repository.listRides),
  listBookings: (query) => withPagination(query, repository.listBookings),
  listKycApplications: (query) => withPagination(query, repository.listKycApplications),
};
