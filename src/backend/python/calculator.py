import math
import json
import sys
import codecs
import re

def calculate_trig(expression):
    """三角関数部分を計算"""
    try:
        if not expression:
            return {
                "result": "",
                "intermediate": "",
                "error": None
            }

        expression = expression.strip()

        # πを含む場合、表示用の式を保持
        display_expression = expression
        
        # 三角関数のチェック
        trig_functions = ['sin', 'cos', 'tan']
        for func in trig_functions:
            if func in expression:
                # 三角関数の後に数字または(が続いているかチェック
                pattern = f"{func}(?![0-9\(])"
                if re.search(pattern, expression):
                    return {
                        "result": expression,
                        "intermediate": f"{func}の後に数値または括弧が必要です",
                        "error": None
                    }

        # バリデーションチェック
        validation_error = validate_expression(expression)
        if validation_error:
            return {
                "result": expression,
                "intermediate": validation_error,
                "error": True
            }

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
    except Exception as e:
        return {
            "result": expression,
            "intermediate": str(e),
            "error": None
        }
    return None, 3

def normalize_operators(expression):
    """演算子を標準形式に変換"""
    # 数字の後のπを掛け算として処理
    result = ""
    i = 0
    while i < len(expression):
        if i + 3 <= len(expression) and expression[i:i+3] in ['sin', 'cos', 'tan']:
            # sin, cos, tanの直前が数字または')'なら掛け算記号を挿入
            if i > 0 and (expression[i-1].isdigit() or expression[i-1] == ')'):
                result += '*'

            trig_result, next_pos = calculate_trig(expression[i:])
            if trig_result is not None:
                result += trig_result
                i += next_pos
                continue
        
        # 2乗の処理
        if expression[i] == '^' and i + 1 < len(expression) and expression[i+1] == '2':
            # 直前の数値を2乗に変換
            result += '**2'
            i += 2
            continue
        
        if i > 0 and expression[i] == 'π' and (expression[i-1].isdigit() or expression[i-1] == ')'):
            result += '*' + str(math.pi)
        elif expression[i] == 'π':
            result += str(math.pi)
        # 数字の後に括弧が来た場合、掛け算を挿入
        elif i > 0 and expression[i] == '(' and (expression[i-1].isdigit() or expression[i-1] == ')'):
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
    """数式を計算する関数"""
    try:
        if not expression:
            return {
                "result": "",
                "intermediate": "Error"
            }

        # 文字列型に変換
        if not isinstance(expression, str):
            expression = str(expression)

        # 空白を削除
        expression = expression.strip()

        # 三角関数のチェック
        for func in ['sin', 'cos', 'tan']:
            if func in expression and not re.search(f"{func}[0-9\(]", expression):
                return {
                    "result": expression,
                    "intermediate": "Error"
                }

        # バリデーションチェック
        validation_error = validate_expression(expression)
        if validation_error:
            if any(func in expression for func in ['sin', 'cos', 'tan']):
                return {
                    "result": validation_error,
                    "intermediate": "Error"
                }
            return {
                "result": expression,
                "intermediate": validation_error
            }

        # 括弧の対応をチェック
        open_count = expression.count('(')
        close_count = expression.count(')')
        if open_count > close_count:
            # 括弧が不完全な場合、式をresultに、"Error"をintermediateに返す
            try:
                normalized = normalize_operators(expression)
                calc_result = eval_expression(normalized)
                if isinstance(calc_result, str):
                    return {
                        "result": expression,
                        "intermediate": "Error"
                    }
                return {
                    "result": expression,
                    "intermediate": "Error"
                }
            except:
                return {
                    "result": expression,
                    "intermediate": "Error"
                }

        # 式が演算子で終わっている場合は、の演算子を無視して計算
        if expression and expression[-1] in '+-×÷*/.(':
            expression = expression[:-1]
            normalized = normalize_operators(expression)
            try:
                result = eval_expression(normalized)
                if isinstance(result, str):
                    return {
                        "result": result,
                        "intermediate": result
                    }
                formatted = format_number(result)
                return {
                    "result": formatted,
                    "intermediate": formatted
                }
            except:
                return {
                    "result": expression,
                    "intermediate": "Error"
                }

        # 式を標準形式に変換して計算
        normalized = normalize_operators(expression)
        try:
            result = eval_expression(normalized)
            if isinstance(result, str):
                return {"result": display_expression, "intermediate": expression}
            
            # πの倍数かどうかをチェック
            pi_multiple = result / math.pi
            if abs(pi_multiple - round(pi_multiple)) < 1e-10:
                if abs(pi_multiple - 1) < 1e-10:
                    return {
                        "result": "π",
                        "intermediate": f"{math.pi:.13f}"
                    }
                else:
                    return {
                        "result": f"{round(pi_multiple)}π",
                        "intermediate": f"{result:.13f}"
                    }
            
            # その他の数値の場合
            formatted = f"{result:.13f}".rstrip('0').rstrip('.')
            return {
                "result": formatted,
                "intermediate": formatted
            }
        except:
            return {"result": display_expression, "intermediate": expression}

    except Exception as e:
        return {"error": "Error"}

def get_last_complete_calculation(expression):
    """最後の完全な計算部分を取得して計算"""
    try:
        # 式が演算子で終わている場合は、その前までを計算
        if expression and expression[-1] in '+-×÷*/.(':
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
        allowed = set('0123456789.+-*/() π^')  # ^を追加
        if not all(c in allowed for c in expression):
            raise ValueError("不正な文字が含まれています")

        # πをmath.piに置換
        expression = expression.replace('π', str(math.pi))

        try:
            # 式を価（組み込み関数へのアクセスを制限）
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
            # πの倍数かどうかをチェック
            pi_multiple = number / math.pi
            if abs(pi_multiple - round(pi_multiple)) < 1e-10:
                if abs(pi_multiple - 1) < 1e-10:
                    return "π"
                else:
                    return f"{round(pi_multiple)}π"
            
            # その他の数値は通常の表示形式
            if isinstance(number, float):
                formatted = f"{number:.13f}".rstrip('0').rstrip('.')
                return formatted
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

def validate_expression(expression):
    # 既存のバリデーションコード
    if not expression:
        return "式が入力されていません"
    
    # 括弧のチェック
    if not check_parentheses(expression):
        return "Error"
    
    # 演算子の連続チェック
    if re.search(r'[\+\-\*\/]{2,}', expression):
        return "演算子が連続しています"
        
    # sin, cos, tanの後に数字がないケースをチェック
    trig_functions = ['sin', 'cos', 'tan']
    for func in trig_functions:
        if func in expression:
            # 三角関数の後に数字または(が続いているかチェック
            pattern = f"{func}(?![0-9\(])"
            if re.search(pattern, expression):
                return expression
    
    return None

def convert_unit(value, from_unit, to_unit):
    """単位変換を行う関数"""
    try:
        value = float(value)
        # 不要な小数点以下の0を削除する関数
        def format_value(num):
            return f"{num:.10f}".rstrip('0').rstrip('.')

        # 長さの変換
        if (from_unit == 'm' and to_unit == 'mm'):
            result = value * 1000
            return {
                "result": format_value(result),
                "intermediate": f"{format_value(value)}×1000={format_value(result)}"
            }
        elif (from_unit == 'mm' and to_unit == 'm'):
            result = value / 1000
            return {
                "result": format_value(result),
                "intermediate": f"{format_value(value)}÷1000={format_value(result)}"
            }
        # 面積の変換
        elif (from_unit == 'm2' and to_unit == 'mm2'):
            result = value * 1000000
            return {
                "result": format_value(result),
                "intermediate": f"{format_value(value)}×1000000={format_value(result)}"
            }
        elif (from_unit == 'mm2' and to_unit == 'm2'):
            result = value / 1000000
            return {
                "result": format_value(result),
                "intermediate": f"{format_value(value)}÷1000000={format_value(result)}"
            }
        else:
            return {"error": "未対応の単位変換です"}
    except ValueError:
        return {"error": "無効な数値です"}
    except Exception as e:
        return {"error": str(e)}

def main():
    # 標準出力と標準エラー出力をUTF-8に設定
    if sys.platform == 'win32':
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    else:
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)

    while True:
        try:
            # 標準入力から式を読み込む（UTF-8として）
            line = sys.stdin.buffer.readline().decode('utf-8').strip()
            if not line:
                continue

            try:
                # JSONとしてパースを試みる
                data = json.loads(line)
                if isinstance(data, dict) and data.get('command') == 'convert_unit':
                    # 単位変換の処理
                    result = convert_unit(
                        data.get('value'),
                        data.get('from_unit'),
                        data.get('to_unit')
                    )
                else:
                    # 通常の計算処理
                    result = calculate(line)
            except json.JSONDecodeError:
                # JSON解析に失敗した場合は通常の計算として処理
                result = calculate(line)
            
            # 結果を出力
            print(json.dumps(result, ensure_ascii=False))
            sys.stdout.flush()

        except Exception as e:
            print(json.dumps({"error": str(e)}, ensure_ascii=False))
            sys.stdout.flush()

if __name__ == "__main__":
    main()
