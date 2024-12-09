import sys
import json
import tkinter as tk
from PIL import Image
import mss
import base64
from io import BytesIO

def capture_screen():
    root = tk.Tk()
    root.withdraw()  # メインウィンドウを非表示

    # 全ディスプレイの情報を取得
    with mss.mss() as sct:
        monitors = sct.monitors[1:]  # 最初のモニターは全画面の合成なので除外
        
        # 各モニターに対して半透明のウィンドウを作成
        overlay_windows = []
        for monitor in monitors:
            overlay = tk.Toplevel(root)
            overlay.attributes('-alpha', 0.3)  # 半透明に
            overlay.attributes('-topmost', True)  # 最前面に
            
            # ウィンドウをモニターの位置とサイズに合わせる
            geometry = f"{monitor['width']}x{monitor['height']}+{monitor['left']}+{monitor['top']}"
            overlay.geometry(geometry)
            
            # ウィンドウの装飾を削除
            overlay.overrideredirect(True)
            
            # キャンバスを作成
            canvas = tk.Canvas(
                overlay,
                width=monitor['width'],
                height=monitor['height'],
                cursor="cross",
                highlightthickness=0
            )
            canvas.pack(fill=tk.BOTH, expand=True)
            
            # モニター情報をキャンバスに関連付け
            canvas.monitor = monitor
            
            overlay_windows.append((overlay, canvas))
        
        selection = {}
        
        def on_mouse_down(event):
            canvas = event.widget
            monitor = canvas.monitor
            
            # グローバル座標に変換
            selection['start_x'] = event.x + monitor['left']
            selection['start_y'] = event.y + monitor['top']
            selection['monitor'] = monitor
            
            # 他のウィンドウの選択範囲をクリア
            for _, c in overlay_windows:
                c.delete('selection')
            
        def on_mouse_move(event):
            if 'start_x' not in selection:
                return
                
            canvas = event.widget
            monitor = canvas.monitor
            
            # グローバル座標に変換
            current_x = event.x + monitor['left']
            current_y = event.y + monitor['top']
            
            # 全てのキャンバスの選択範囲をクリア
            for _, c in overlay_windows:
                c.delete('selection')
            
            # 選択範囲を描画
            for _, c in overlay_windows:
                mon = c.monitor
                # モニターローカル座標に変換
                local_start_x = selection['start_x'] - mon['left']
                local_start_y = selection['start_y'] - mon['top']
                local_current_x = current_x - mon['left']
                local_current_y = current_y - mon['top']
                
                # 選択範囲がこのモニターと交差するか確認
                if (local_start_x < mon['width'] and local_current_x >= 0 and
                    local_start_y < mon['height'] and local_current_y >= 0):
                    # 範囲をモニター内に制限
                    draw_x1 = max(0, min(local_start_x, mon['width']))
                    draw_y1 = max(0, min(local_start_y, mon['height']))
                    draw_x2 = max(0, min(local_current_x, mon['width']))
                    draw_y2 = max(0, min(local_current_y, mon['height']))
                    
                    c.create_rectangle(
                        draw_x1, draw_y1, draw_x2, draw_y2,
                        outline='red',  # メインの方は赤色のまま
                        tags='selection'
                    )
            
        def on_mouse_up(event):
            if 'start_x' not in selection:
                return
                
            canvas = event.widget
            monitor = canvas.monitor
            
            # グローバル座標に変換
            end_x = event.x + monitor['left']
            end_y = event.y + monitor['top']
            
            # 選択範囲の座標を計算
            left = min(selection['start_x'], end_x)
            top = min(selection['start_y'], end_y)
            width = abs(end_x - selection['start_x'])
            height = abs(end_y - selection['start_y'])
            
            # すべてのオーバーレイを非表示
            for overlay, _ in overlay_windows:
                overlay.withdraw()
            
            # スクリーンショットを撮影
            try:
                screenshot = sct.grab({
                    "left": left,
                    "top": top,
                    "width": width,
                    "height": height
                })
                
                # PILイメージに変換
                img = Image.frombytes("RGB", screenshot.size, screenshot.rgb)
                
                # Base64エンコード
                buffer = BytesIO()
                img.save(buffer, format="PNG")
                img_str = base64.b64encode(buffer.getvalue()).decode()
                
                # 結果を出力
                result = {
                    "status": "success",
                    "image": img_str,
                    "type": "main"  # メインのスクリーンショットであることを示す
                }
                print(json.dumps(result))
            except Exception as e:
                result = {
                    "status": "error",
                    "message": str(e)
                }
                print(json.dumps(result))
            
            root.quit()
        
        # イベントをバインド
        for _, canvas in overlay_windows:
            canvas.bind('<Button-1>', on_mouse_down)
            canvas.bind('<B1-Motion>', on_mouse_move)
            canvas.bind('<ButtonRelease-1>', on_mouse_up)
            # ESCキーでキャンセル
            canvas.bind('<Escape>', lambda e: root.quit())
        
        root.mainloop()

if __name__ == "__main__":
    capture_screen() 