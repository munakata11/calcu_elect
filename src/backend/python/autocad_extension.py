import sys
import json
import os
from pathlib import Path
import win32com.client
from pyautocad import Autocad, APoint
import time

def main():
    try:
        # AutoCADアプリケーションに接続
        acad = Autocad(create_if_not_exists=False)
        
        # AutoCADが起動していることを確認
        if not acad.doc:
            print(json.dumps({
                "status": "error",
                "message": "AutoCADが起動していません。"
            }))
            return

        # LISPファイルのパスを取得
        current_dir = Path(__file__).parent.parent
        lisp_path = current_dir / "lisp" / "measure_distance.lsp"
        
        if not lisp_path.exists():
            print(json.dumps({
                "status": "error",
                "message": f"LISPファイルが見つかりません。パス: {lisp_path}"
            }))
            return

        # WindowsパスをAutoCAD用に変換（バックスラッシュをスラッシュに変換）
        acad_path = str(lisp_path.absolute()).replace("\\", "/")
        
        try:
            # LISPファイルを読み込んで実行
            load_command = f'(load "{acad_path}")\n'
            acad.doc.SendCommand(load_command)
            
            # 少し待機して、ファイルが確実に読み込まれるのを待つ
            time.sleep(0.5)
            
            # measure_two_points関数を実行
            acad.doc.SendCommand('(c:measure_two_points)\n')
            
            # コマンドの実行を待機
            time.sleep(0.5)
            acad.doc.SendCommand('(princ)\n')
            
            # 結果を取得
            distance = float(acad.doc.GetVariable("measuregeom"))
            print(json.dumps({
                "status": "success",
                "distance": distance
            }))
            
        except Exception as e:
            print(json.dumps({
                "status": "error",
                "message": f"コマンド実行エラー: {str(e)}"
            }))
        
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": str(e)
        }))

if __name__ == "__main__":
    main() 