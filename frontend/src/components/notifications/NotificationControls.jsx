import React from 'react';
import { Space, Switch, Button, Tooltip, Typography } from 'antd';
import { 
  SoundOutlined, 
  MutedOutlined, 
  ReloadOutlined,
  BellOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNotifications } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';

const { Text } = Typography;

const NotificationControls = ({ 
  showAutoRefresh = true, 
  showSound = true, 
  showRefresh = true,
  size = 'small',
  layout = 'horizontal' // 'horizontal' or 'vertical'
}) => {
  const { 
    soundEnabled, 
    autoRefresh, 
    pendingOrdersCount,
    toggleSound, 
    toggleAutoRefresh, 
    refreshNotifications,
    playNotificationSound 
  } = useNotifications();
  
  const { t } = useLanguage();

  const handleTestSound = () => {
    playNotificationSound();
  };

  const controls = [
    showAutoRefresh && {
      key: 'autoRefresh',
      component: (
        <Tooltip title={autoRefresh ? t('notifications.auto_refresh_enabled') : t('notifications.auto_refresh_disabled')}>
          <Switch
            checked={autoRefresh}
            onChange={toggleAutoRefresh}
            checkedChildren={<BellOutlined />}
            unCheckedChildren={<EyeOutlined />}
            size={size}
          />
        </Tooltip>
      )
    },
    showSound && {
      key: 'sound',
      component: (
        <Tooltip title={soundEnabled ? t('notifications.sound_enabled') : t('notifications.sound_disabled')}>
          <Switch
            checked={soundEnabled}
            onChange={toggleSound}
            checkedChildren={<SoundOutlined />}
            unCheckedChildren={<MutedOutlined />}
            size={size}
          />
        </Tooltip>
      )
    },
    showSound && {
      key: 'testSound',
      component: (
        <Tooltip title={t('notifications.test_sound')}>
          <Button
            type="text"
            size={size}
            icon={<SoundOutlined />}
            onClick={handleTestSound}
            disabled={!soundEnabled}
          />
        </Tooltip>
      )
    },
    showRefresh && {
      key: 'refresh',
      component: (
        <Tooltip title={t('notifications.refresh_now')}>
          <Button
            type="text"
            size={size}
            icon={<ReloadOutlined />}
            onClick={refreshNotifications}
          />
        </Tooltip>
      )
    }
  ].filter(Boolean);

  const SpaceComponent = layout === 'vertical' ? 
    ({ children }) => <Space direction="vertical" size="small">{children}</Space> :
    ({ children }) => <Space size="small">{children}</Space>;

  return (
    <SpaceComponent>
      {controls.map(control => (
        <span key={control.key}>{control.component}</span>
      ))}
      {pendingOrdersCount > 0 && (
        <Text 
          type="warning" 
          style={{ 
            fontSize: size === 'small' ? '12px' : '14px',
            fontWeight: 'bold'
          }}
        >
          {t('notifications.pending_orders', { count: pendingOrdersCount })}
        </Text>
      )}
    </SpaceComponent>
  );
};

export default NotificationControls;
