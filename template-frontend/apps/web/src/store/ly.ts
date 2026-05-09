import { defineStore } from 'pinia';

import {
  lyBlacklistApi,
  lyDeviceApi,
  lyEventActionApi,
  lyEventGet,
  lyEventIgnoreApi,
  lyEventLevelApi,
  lyEventRulesApi,
  lyEventTypeApi,
  lyFeatureMo,
  lyInternalApi,
  lyMoApi,
  lyMoGroupApi,
  lyProxyApi,
  lyUserApi,
  lyWhitelistApi,
} from '#/api/ly';
import { normalizeLyEvents } from '#/utils/ly';

export const useLyStore = defineStore('ly', {
  state: () => ({
    loading: false,
    events: [] as Record<string, any>[],
    internal: [] as Record<string, any>[],
    black: [] as Record<string, any>[],
    white: [] as Record<string, any>[],
    device: [] as Record<string, any>[],
    proxy: [] as Record<string, any>[],
    userList: [] as Record<string, any>[],
    mo: [] as Record<string, any>[],
    moGroup: [] as Record<string, any>[],
    eventRules: [] as Record<string, any>[],
    eventIgnore: [] as Record<string, any>[],
    eventType: [] as Record<string, any>[],
    eventLevel: [] as Record<string, any>[],
    eventAction: [] as Record<string, any>[],
    moFeature: [] as Record<string, any>[],
  }),
  actions: {
    async loadEvents(params?: Record<string, any>) {
      this.loading = true;
      try {
        const data = await lyEventGet(params);
        this.events = normalizeLyEvents(Array.isArray(data) ? data : []);
        return this.events;
      } finally {
        this.loading = false;
      }
    },
    async loadConfigs() {
      const [internal, black, white, device, proxy, userList, mo, moGroup, eventRules, eventIgnore, eventType, eventLevel, eventAction] =
        await Promise.all([
          lyInternalApi(),
          lyBlacklistApi(),
          lyWhitelistApi(),
          lyDeviceApi(),
          lyProxyApi(),
          lyUserApi(),
          lyMoApi(),
          lyMoGroupApi(),
          lyEventRulesApi(),
          lyEventIgnoreApi(),
          lyEventTypeApi(),
          lyEventLevelApi(),
          lyEventActionApi(),
        ]);

      this.internal = Array.isArray(internal) ? internal : [];
      this.black = Array.isArray(black) ? black : [];
      this.white = Array.isArray(white) ? white : [];
      this.device = Array.isArray(device) ? device : [];
      this.proxy = Array.isArray(proxy) ? proxy : [];
      this.userList = Array.isArray(userList) ? userList : [];
      this.moGroup = Array.isArray(moGroup) ? moGroup : [];
      const groups = this.moGroup;
      this.mo = (Array.isArray(mo) ? mo : []).map((item) => ({
        ...item,
        groupid:
          item.groupid ??
          groups.find((group) => group.name === item.mogroup)?.id,
      }));
      this.eventRules = Array.isArray(eventRules) ? eventRules : [];
      this.eventIgnore = Array.isArray(eventIgnore) ? eventIgnore : [];
      this.eventType = Array.isArray(eventType) ? eventType : [];
      this.eventLevel = Array.isArray(eventLevel) ? eventLevel : [];
      this.eventAction = Array.isArray(eventAction) ? eventAction : [];
    },
    async loadTrackFeatures(params?: Record<string, any>) {
      const data = await lyFeatureMo(params);
      this.moFeature = Array.isArray(data) ? data : [];
      return this.moFeature;
    },
  },
});
