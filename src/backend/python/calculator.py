import math
import json
import sys

def calculate(expression):
    try:
        # デバッグ用：受け取った式の型と内容を出力
        print(json.dumps({
            "debug": f"受け取った式: {expression}, 型: {type(expression)}"
        }), file=sys.stderr)
        
        if not expression:
            return {"error": "式が空です"}

        # 文字列型に変換（JSON経由で来る場合の対応）
        if not isinstance(expression, str):
            expression = str(expression)

        # 空白を削除
        expression = expression.strip()

        # =を含む場合は=の前の部分だけを計算
        if '=' in expression:
            expression = expression.split('=')[0]

        # 三角関数の処理
        for func in ['sin', 'cos', 'tan']:
            if expression.startswith(func):
                try:
                    angle = float(expression[3:])
                    result = getattr(math, func)(math.radians(angle))
                    return format_result(result)
                except:
                    return {"error": "三角関数の計算でエラーが発生しました"}

        # 掛け算・割り算の記号を置換（全角記号対応）
        expression = (expression
            .replace('×', '*')
            .replace('÷', '/')
            .replace('－', '-')
            .replace('＋', '+')
            .replace('（', '(')
            .replace('）', ')')
        )

        # デバッグ用：変換後の式と型を出力
        print(json.dumps({
            "debug": f"変換後の式: {expression}, 型: {type(expression)}"
        }), file=sys.stderr)

        # 数式を評価
        result = eval_expression(expression)
        return format_result(result)

    except Exception as e:
        return {"error": f"計算エラー: {str(e)}"}

def eval_expression(expression):
    try:
        # 使用可能な文字をチェック
        allowed = set('0123456789.+-*/()× ÷')
        if not all(c in allowed for c in expression):
            raise ValueError("不正な文字が含まれています")

        try:
            # 式を評価（組み込み関数へのアクセスを制限）
            result = float(eval(expression, {"__builtins__": {}}, {}))
            
            # 結果の検証
            if math.isnan(result) or math.isinf(result):
                raise ValueError("無効な計算結果です")
                
            return result
            
        except SyntaxError:
            raise ValueError("不正な式です")
        except ZeroDivisionError:
            raise ValueError("0での除算はできません")
        except Exception as e:
            raise ValueError(f"計算エラー: {str(e)}")

    except Exception as e:
        raise ValueError(f"計算エラー: {str(e)}")

def format_result(number):
    """結果を適切な形式にフォーマット"""
    try:
        # 整数かどうかをチェック
        if float(number).is_integer():
            return {"result": str(int(number))}
        else:
            # 小数点以下の不要な0を削除
            return {"result": f"{float(number):g}"}
    except:
        return {"error": "結果のフォーマットに失敗しました"}

def main():
    while True:
        try:
            # 標準入力から式を読み込む
            line = sys.stdin.readline().strip()
            if not line:
                continue

            # デバッグ用：受け取った入力の内容を出力
            print(json.dumps({
                "debug": f"受け取った入力: {line}, 型: {type(line)}"
            }), file=sys.stderr)

            # 計算を実行
            result = calculate(line)
            
            # 結果を出力
            print(json.dumps(result))
            sys.stdout.flush()

        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.stdout.flush()

if __name__ == "__main__":
    main() 