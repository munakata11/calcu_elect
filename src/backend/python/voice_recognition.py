#!/usr/bin/env python
# -*- coding: utf-8 -*-

import speech_recognition as sr
import pyaudio
import json
import sys
import io

# 標準出力のエンコーディングをUTF-8に設定
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def main():
    recognizer = sr.Recognizer()
    
    try:
        with sr.Microphone() as source:
            print(json.dumps({"status": "info", "message": "マイクテストを開始します..."}, ensure_ascii=False))
            sys.stdout.flush()
            
            # マイクの情報を取得
            p = pyaudio.PyAudio()
            device_info = p.get_default_input_device_info()
            print(json.dumps({
                "status": "info", 
                "message": f"マイク入力デバイス: {device_info['name']}"
            }, ensure_ascii=False))
            
            # 環境ノイズを調整
            print(json.dumps({"status": "info", "message": "環境ノイズを調整中..."}, ensure_ascii=False))
            recognizer.adjust_for_ambient_noise(source, duration=1)
            
            # 実際の音声レベルをモニタリング
            print(json.dumps({"status": "info", "message": "音声レベルをテスト中..."}, ensure_ascii=False))
            for _ in range(5):  # 5秒間テスト
                try:
                    audio = recognizer.listen(source, timeout=1, phrase_time_limit=1)
                    level = max(abs(x) for x in audio.get_raw_data())
                    print(json.dumps({
                        "status": "info",
                        "message": f"音声レベル: {level}"
                    }, ensure_ascii=False))
                except sr.WaitTimeoutError:
                    print(json.dumps({
                        "status": "info",
                        "message": "音声が検出されませんでした"
                    }, ensure_ascii=False))
                sys.stdout.flush()
            
            p.terminate()  # PyAudioのクリーンアップ
            
            # 通常の音声認識処理を続ける
            print(json.dumps({"status": "info", "message": "音声認識を開始しました"}, ensure_ascii=False))
            sys.stdout.flush()
            
            while True:
                try:
                    # タイムアウト時間を延長（5秒）
                    audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
                    text = recognizer.recognize_google(audio, language='ja-JP')
                    
                    result = {"text": text, "status": "success"}
                    print(json.dumps(result, ensure_ascii=False))
                    sys.stdout.flush()
                    
                except sr.WaitTimeoutError:
                    # タイムアウトは正���なケースとして処理
                    continue
                    
                except sr.UnknownValueError:
                    result = {"text": "", "status": "no_speech"}
                    print(json.dumps(result, ensure_ascii=False))
                    sys.stdout.flush()
                    
                except sr.RequestError as e:
                    result = {"text": "", "status": "error", "message": str(e)}
                    print(json.dumps(result, ensure_ascii=False))
                    sys.stdout.flush()
                    
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": f"予期せぬエラーが発生しました: {str(e)}"
        }, ensure_ascii=False))
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main() 