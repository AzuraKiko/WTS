// Type definitions for dayjs plugins
declare module 'dayjs/plugin/weekday' {
  import { PluginFunc } from 'dayjs';
  const plugin: PluginFunc;
  export = plugin;
}

declare module 'dayjs/plugin/localizedFormat' {
  import { PluginFunc } from 'dayjs';
  const plugin: PluginFunc;
  export = plugin;
}

declare module 'dayjs/locale/en' {
  const locale: any;
  export = locale;
} 