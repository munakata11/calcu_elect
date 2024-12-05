import math
import json
import sys

def calculate(expression):
    try:
        if not expression:
            return {"error": "式が空です"}

        # 文字列型に変換（JSON経由で来る場合の対応）
        if not isinstance(expression, str):
            expression = str(expression)

        # 空白を削除
        expression = expression.strip()

        # =を含む場合は最終計算を実行
        if '=' in expression:
            expression = expression.split('=')[0]
            # 最終計算時に演算子を変換
            normalized_expression = normalize_operators(expression)
            try:
                result = eval_expression(normalized_expression)
                if isinstance(result, str):
                    return {"result": expression, "intermediate": expression}
                return {"result": format_number(result), "intermediate": expression}
            except:
                return {"result": expression, "intermediate": expression}

        # 式が演算子で終わっている場合は、式をそのまま返す
        if expression[-1] in '+-×÷*/':
            last_calc = get_last_complete_calculation(expression)
            return {
                "result": expression,
                "intermediate": last_calc if last_calc else expression[:-1]
            }

        # 通常の途中計算
        last_calc = get_last_complete_calculation(expression)
        return {
            "result": expression,
            "intermediate": last_calc if last_calc else expression
        }

    except Exception as e:
        return {"error": f"計算エラー: {str(e)}"}

def normalize_operators(expression):
    """演算子を標準形式に変換"""
    # 一度に1文字ずつ処理して、演算子の変換を確実に行う
    result = ""
    for char in expression:
        if char == '×':
            result += '*'
        elif char == '÷':
            result += '/'
        elif char == '－':
            result += '-'
        elif char == '＋':
            result += '+'
        elif char == '（':
            result += '('
        elif char == '）':
            result += ')'
        else:
            result += char
    return result

def get_last_complete_calculation(expression):
    """最後の完全な計算部分を取得して計算"""
    try:
        # 式が演算子で終わっている場合は、その前までを計算
        if expression[-1] in '+-×÷*/':
            expression = expression[:-1]

        # 式を標準形式に変換して計算
        normalized = normalize_operators(expression)
        try:
            result = eval_expression(normalized)
            if isinstance(result, str):
                return expression
            return format_number(result)
        except:
            return expression

    except:
        return expression

def eval_expression(expression):
    try:
        # 使用可能な文字をチェック
        allowed = set('0123456789.+-*/() ')
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
            return expression
        except ZeroDivisionError:
            raise ValueError("0での除算はできません")
        except Exception as e:
            raise ValueError(f"計算エラー: {str(e)}")

    except Exception as e:
        raise ValueError(f"計算エラー: {str(e)}")

def format_number(number):
    """数値を適切な形式にフォーマット"""
    try:
        if float(number).is_integer():
            return str(int(number))
        else:
            return f"{float(number):g}"
    except:
        return None

def format_result(number):
    """��果を適切な形式にフォーマット"""
    try:
        formatted = format_number(number)
        if formatted is None:
            return {"error": "結果のフォーマットに失敗しました"}
        return {"result": formatted}
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