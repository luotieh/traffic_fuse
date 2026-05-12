import type { Router } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { accessRoutes, coreRouteNames } from '#/router/routes';
import { useAuthStore } from '#/store';
import { isSSOMode, redirectToSSO } from '#/utils/sso';

import { generateAccess } from './access';

function setupCommonGuard(router: Router) {
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    loadedPaths.add(to.path);
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

function redirectToLogin(toFullPath: string) {
  if (isSSOMode()) {
    redirectToSSO(toFullPath);
    return false;
  }

  return {
    path: LOGIN_PATH,
    query:
      toFullPath === preferences.app.defaultHomePath
        ? {}
        : { redirect: encodeURIComponent(toFullPath) },
    replace: true,
  };
}

function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    // ★ 开发模式下跳过登录 - 临时修改
    const SKIP_LOGIN = true;
    if (SKIP_LOGIN) {
      // 如果没有设置 token，先设置一个模拟 token
      if (!accessStore.accessToken) {
        accessStore.setAccessToken('skip-login-mock-token');
      }

      // 如果没有用户信息，设置模拟用户信息
      if (!userStore.userInfo) {
        const mockUserInfo = {
          userId: 'mock-user-id',
          username: 'admin',
          realName: '管理员',
          avatar: '',
          email: 'admin@example.com',
          phone: '',
          roles: ['admin'],
          homePath: '/ly/overview/om',
        };
        userStore.setUserInfo(mockUserInfo);
      }

      // 如果没有访问权限信息，生成模拟权限
      if (!accessStore.isAccessChecked) {
        try {
          const userRoles = (userStore.userInfo?.roles as string[]) ?? ['admin'];

          const { accessibleMenus, accessibleRoutes } = await generateAccess({
            roles: userRoles,
            router,
            routes: accessRoutes,
          });

          accessStore.setAccessMenus(accessibleMenus);
          accessStore.setAccessRoutes(accessibleRoutes);
          accessStore.setIsAccessChecked(true);
          accessStore.setAccessCodes(['*']);

          // 如果是登录页，跳转到首页
          if (to.path === LOGIN_PATH) {
            return decodeURIComponent(
              (to.query?.redirect as string) ||
                userStore.userInfo?.homePath ||
                preferences.app.defaultHomePath,
            );
          }
          return {
            ...router.resolve(to.fullPath),
            replace: true,
          };
        } catch {
          // 忽略错误
        }
      }
      return true;
    }

    if (coreRouteNames.includes(to.name as string)) {
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        return decodeURIComponent(
          (to.query?.redirect as string) ||
            userStore.userInfo?.homePath ||
            preferences.app.defaultHomePath,
        );
      }
      return true;
    }

    if (!accessStore.accessToken) {
      if (to.meta.ignoreAccess) {
        return true;
      }
      if (to.fullPath !== LOGIN_PATH) {
        return redirectToLogin(to.fullPath);
      }
      return to;
    }

    if (accessStore.isAccessChecked) {
      return true;
    }

    try {
      const userInfo = userStore.userInfo || (await authStore.fetchUserInfo());
      const userRoles = userInfo.roles ?? [];

      const { accessibleMenus, accessibleRoutes } = await generateAccess({
        roles: userRoles,
        router,
        routes: accessRoutes,
      });

      accessStore.setAccessMenus(accessibleMenus);
      accessStore.setAccessRoutes(accessibleRoutes);
      accessStore.setIsAccessChecked(true);
      const redirectPath = (from.query.redirect ??
        (to.path === preferences.app.defaultHomePath
          ? userInfo.homePath || preferences.app.defaultHomePath
          : to.fullPath)) as string;

      return {
        ...router.resolve(decodeURIComponent(redirectPath)),
        replace: true,
      };
    } catch {
      accessStore.setAccessToken(null);
      return redirectToLogin(to.fullPath);
    }
  });
}

function createRouterGuard(router: Router) {
  setupCommonGuard(router);
  setupAccessGuard(router);
}

export { createRouterGuard };
