import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useUpdater, checkForUpdate, startUpdate, cancelUpdate } from './updater';
import { downloadPercent, formatMb } from './core';
import { shared } from '../theme';
import { useTranslation } from '../i18n';
export function UpdateBanner({onPress}:{onPress:()=>void}){const u=useUpdater();const {t}=useTranslation();if(!u.build?.newer)return null;return <Pressable onPress={onPress}><Text style={shared.body}>⬆ {t('common.update.available')}</Text></Pressable>;}
export function UpdateSettingsSection(){const u=useUpdater();const {t}=useTranslation();return <View><Text style={shared.h2}>{t('common.update.section')}</Text><Text style={shared.body}>{t('common.update.current')}: {u.versionName} ({u.versionCode})</Text><Text style={shared.body}>{u.phase==='downloading'?`${downloadPercent(u.bytes,u.totalBytes)}% · ${formatMb(u.speedBps)} MB/s`:u.phase==='upToDate'?t('common.update.latest'):u.phase==='checking'?t('common.update.checking'):u.phase==='needsPermission'?t('common.update.permission'):u.phase==='installing'?t('common.update.installing'):u.error??(u.build?.newer?`New build ${u.build.version_name}`:'')}</Text>{u.phase==='downloading'?<Text onPress={()=>void cancelUpdate()}>{t('common.update.cancel')}</Text>:<Text onPress={()=>void (u.build?.newer?startUpdate():checkForUpdate(false))}>{u.build?.newer?t('common.update.install'):t('common.update.check')}</Text>}</View>;}
