'use client';

import { useEffect, useRef, useState } from 'react';

export interface SoundPlayerProps {
  enabled: boolean;
  volume: number;
  levelFilters: {
    info: { enabled: boolean; sound: boolean };
    warning: { enabled: boolean; sound: boolean };
    critical: { enabled: boolean; sound: boolean };
  };
}

export class SoundPlayerManager {
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private volume: number = 0.8;
  private enabled: boolean = true;
  private levelFilters: SoundPlayerProps['levelFilters'] = {
    info: { enabled: false, sound: false },
    warning: { enabled: true, sound: true },
    critical: { enabled: true, sound: true }
  };
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * 初始化
   */
  private async initialize() {
    if (this.isInitialized) return;

    try {
      // 初始化 AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 加载声音文件
      await this.loadSounds();
      
      this.isInitialized = true;
      console.log('[SoundPlayer] 初始化成功');
    } catch (error) {
      console.error('[SoundPlayer] 初始化失败:', error);
    }
  }

  /**
   * 加载声音文件
   */
  private async loadSounds() {
    const sounds = [
      { level: 'info', url: '/sounds/info.mp3' },
      { level: 'warning', url: '/sounds/warning.mp3' },
      { level: 'critical', url: '/sounds/critical.mp3' }
    ];

    for (const { level, url } of sounds) {
      try {
        // 先尝试使用 Web Audio API
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(level, audioBuffer);
        
        console.log(`[SoundPlayer] 加载成功: ${level}`);
      } catch (error) {
        console.warn(`[SoundPlayer] Web Audio 加载失败 (${level}):`, error);
        
        // 降级到 HTML Audio
        try {
          const audio = new Audio(url);
          audio.preload = 'auto';
          this.audioElements.set(level, audio);
        } catch (e) {
          console.error(`[SoundPlayer] HTML Audio 加载失败 (${level}):`, e);
        }
      }
    }
  }

  /**
   * 播放声音
   */
  async play(level: 'info' | 'warning' | 'critical') {
    // 检查是否启用
    if (!this.enabled) {
      return;
    }

    // 检查级别过滤
    const levelConfig = this.levelFilters[level];
    if (!levelConfig.enabled || !levelConfig.sound) {
      return;
    }

    // 确保 AudioContext 已初始化
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 优先使用 Web Audio API
      const audioBuffer = this.audioBuffers.get(level);
      if (audioBuffer && this.audioContext) {
        this.playWithAudioContext(audioBuffer);
        return;
      }

      // 降级到 HTML Audio
      const audioElement = this.audioElements.get(level);
      if (audioElement) {
        this.playWithHtmlAudio(audioElement);
        return;
      }

      // 最后降级到浏览器内置声音
      this.playWithBrowserSound(level);
    } catch (error) {
      console.error('[SoundPlayer] 播放声音失败:', error);
    }
  }

  /**
   * 使用 Web Audio API 播放
   */
  private playWithAudioContext(audioBuffer: AudioBuffer) {
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = audioBuffer;
    gainNode.gain.value = this.volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(0);
  }

  /**
   * 使用 HTML Audio 播放
   */
  private playWithHtmlAudio(audioElement: HTMLAudioElement) {
    audioElement.volume = this.volume;
    audioElement.currentTime = 0;
    
    const playPromise = audioElement.play();
    if (playPromise) {
      playPromise.catch(error => {
        console.error('[SoundPlayer] HTML Audio 播放失败:', error);
      });
    }
  }

  /**
   * 使用浏览器内置声音播放
   */
  private playWithBrowserSound(level: string) {
    if ('speechSynthesis' in window) {
      const textMap = {
        info: '新通知',
        warning: '警告',
        critical: '紧急告警'
      };

      const utterance = new SpeechSynthesisUtterance(textMap[level as keyof typeof textMap] || '新通知');
      utterance.volume = this.volume;
      utterance.rate = 1.2;
      utterance.pitch = 1;

      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SoundPlayerProps>) {
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }

    if (config.volume !== undefined) {
      this.volume = Math.max(0, Math.min(1, config.volume));
    }

    if (config.levelFilters) {
      this.levelFilters = { ...this.levelFilters, ...config.levelFilters };
    }
  }

  /**
   * 获取配置
   */
  getConfig(): SoundPlayerProps {
    return {
      enabled: this.enabled,
      volume: this.volume,
      levelFilters: this.levelFilters
    };
  }
}

// 导出单例
export const soundPlayer = new SoundPlayerManager();
