export const EVENTS = {
  AUTH_LOGIN_SUCCESS: "auth_login_success",
  AUTH_REGISTER_SUCCESS: "auth_register_success",
  AUTH_LOGOUT: "auth_logout",

  POST_VIEWED: "post_viewed",

  BOOKMARK_ADDED: "bookmark_added",
  BOOKMARK_REMOVED: "bookmark_removed",

  SEARCH_USED: "search_used",

  TAG_FILTER_USED: "tag_filter_used",

  EXTERNAL_LINK_CLICKED: "post_external_click",

  CALENDAR_LOCKED_CLICKED: "calendar_locked_clicked",

  ADMIN_POST_CREATED: "admin_post_created",
  ADMIN_POST_UPDATED: "admin_post_updated",
  ADMIN_POST_DELETED: "admin_post_deleted",

  LANDING_PAGE_VIEW: "landing_page_view",
} as const;