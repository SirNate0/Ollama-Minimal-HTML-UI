import http.server
import socketserver

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    # Handle preflight OPTIONS requests
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == '__main__':
    PORT = 8000
    ADDRESS = '0.0.0.0'
    with socketserver.TCPServer((ADDRESS, PORT), CORSRequestHandler) as httpd:
        print(f"Serving at http://{ADDRESS}:{PORT}/ with CORS enabled")
        httpd.serve_forever()

