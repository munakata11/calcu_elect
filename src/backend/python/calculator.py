import math
import json
import sys

def calculate_trig(expression):
    """三角関数部分を計算"""
    try:
        func_name = expression[:3]
        number_part = ""
        i = 3
        while i < len(expression) and (expression[i].isdigit() or expression[i] == '.'):
            number_part += expression[i]
            i += 1
        
        if number_part:
            number = float(number_part)
            radian = math.radians(number)
            if func_name == 'sin':
                result = math.sin(radian)
            elif func_name == 'cos':
                result = math.cos(radian)
            else:  # tan
                result = math.tan(radian)
            return format_number(result), i
    except ValueError:
        pass
    return None, 3

def normalize_operators(expression):
    """演算子を標準形式に変換"""
    # 三角関数を含む式を処理
    result = ""
    i = 0
    while i < len(expression):
        if i + 3 <= len(expression) and expression[i:i+3] in ['sin', 'cos', 'tan']:
            trig_result, next_pos = calculate_trig(expression[i:])
            if trig_result is not None:
                result += trig_result
                i += next_pos
                continue
        
        # 数字の後に括弧が来た場合、掛け算を挿入
        if i > 0 and expression[i] == '(' and (expression[i-1].isdigit() or expression[i-1] == ')'):
            result += '*('
        elif expression[i] == '×':
            result += '*'
        elif expression[i] == '÷':
            result += '/'
        elif expression[i] == '－':
            result += '-'
        elif expression[i] == '＋':
            result += '+'
        elif expression[i] == '（':
            result += '('
        elif expression[i] == '）':
            result += ')'
        else:
            result += expression[i]
        i += 1
    return result

def calculate(expression):
    try:
        if not expression:
            return {"error": "式が空です"}

        # 文字列型に変換（JSON経由で来る場合の対応）
        if not isinstance(expression, str):
            expression = str(expression)

        # 空白を削除
        expression = expression.strip()

        # 式が演算子で終わっている場合は、式をそのまま返す
        if expression[-1] in '+-×÷*/.(':
            last_calc = get_last_complete_calculation(expression)
            return {
                "result": convert_operators(expression),
                "intermediate": last_calc if last_calc else expression[:-1]
            }

        # 式を標準形式に変換して計算
        normalized = normalize_operators(expression)
        try:
            result = eval_expression(normalized)
            if isinstance(result, str):
                return {"result": convert_operators(expression), "intermediate": expression}
            return {
                "result": convert_operators(expression),
                "intermediate": format_number(result)
            }
        except:
            return {"result": convert_operators(expression), "intermediate": expression}

    except Exception as e:
        return {"error": f"計算エラー: {str(e)}"}

def get_last_complete_calculation(expression):
    """最後の完全な計算部分を取得して計算"""
    try:
        # 式が演算子で終わている場合は、その前までを計算
        if expression[-1] in '+-×÷*/.(':
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
            # 括弧の前に数字がある場合の暗黙の掛け算を処理
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
            # 三角関数の結果など、割り切れない値は13桁まで表示
            if isinstance(number, float):
                return f"{number:.13f}".rstrip('0').rstrip('.')
            return f"{float(number):g}"
    except:
        return None

def format_result(number):
    """果を適切な形式にフォーマット"""
    try:
        formatted = format_number(number)
        if formatted is None:
            return {"error": "結果のフォーマットに失敗しました"}
        return {"result": formatted}
    except:
        return {"error": "結果のフォーマットに失敗しました"}

def convert_operators(expression):
    """演算子を×や÷に変換"""
    return expression.replace('*', '×').replace('/', '÷')

def check_parentheses(expression):
    """括弧の対応をチェックする関数"""
    stack = []
    for char in expression:
        if char in '（(':
            stack.append(char)
        elif char in '）)':
            if not stack:
                return False
            stack.pop()
    return len(stack) == 0

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