using System;
using Tobii.Interaction;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace GazeServer
{
    class GazeServerBehavior : WebSocketBehavior
    {
        protected override void OnMessage(MessageEventArgs e)
        { }
    }

    class GazeServer
    {
        private const string DEFAULT_WEBSOCKET_HOST = "localhost";
        private const string DEFAULT_WEBSOCKET_PORT = "8887";

        private const string GAZE_PATH = "/gaze";
        private const string HEAD_PATH = "/head";
        private const string FIXATION_PATH = "/fixation";

        private WebSocketServer server;

        public void Start(string url)
        {
            server = new WebSocketServer(url);
            server.AddWebSocketService<GazeServerBehavior>(GAZE_PATH);
            server.AddWebSocketService<GazeServerBehavior>(HEAD_PATH);
            server.AddWebSocketService<GazeServerBehavior>(FIXATION_PATH);
            server.Start();

            Host host = new Host();
            host.Streams.CreateGazePointDataStream().GazePoint(OnGaze);
            host.Streams.CreateHeadPoseStream().HeadPose(OnHeadPose);
            host.Streams.CreateFixationDataStream().Begin(OnFixationBegin);
            host.Streams.CreateFixationDataStream().Data(OnFixationData);
            host.Streams.CreateFixationDataStream().End(OnFixationEnd);
        }

        private void OnGaze(double x, double y, double timestamp)
        {
            float scale = DPIHelper.GetScreenScale();
            string coordString = $"{x / scale:0.00},{y / scale:0.00}";
            server.WebSocketServices[GAZE_PATH].Sessions.Broadcast(coordString);
        }

        private void OnHeadPose(double timestamp, Vector3 position, Vector3 rotation)
        {
            string coordString = $"{position.X:0.00},{position.Y:0.00},{position.Z:0.00};{rotation.X:0.00},{rotation.Y:0.00},{rotation.Z:0.00}";
            server.WebSocketServices[HEAD_PATH].Sessions.Broadcast(coordString);
        }

        private void OnFixationBegin(double x, double y, double timestamp)
        {
            float scale = DPIHelper.GetScreenScale();
            string coordString = $"FS: {x / scale:0.00},{y / scale:0.00}";
            server.WebSocketServices[FIXATION_PATH].Sessions.Broadcast(coordString);
        }
    
        private void OnFixationData(double x, double y, double timestamp)
        {
            float scale = DPIHelper.GetScreenScale();
            string coordString = $"FD: {x / scale:0.00},{y / scale:0.00}";
            server.WebSocketServices[FIXATION_PATH].Sessions.Broadcast(coordString);
        }

        private void OnFixationEnd(double x, double y, double timestamp)
        {
            float scale = DPIHelper.GetScreenScale();
            string coordString = $"FE: {x / scale:0.00},{y / scale:0.00}";
            server.WebSocketServices[FIXATION_PATH].Sessions.Broadcast(coordString);
        }

        public static void Main(string[] args)
        {
            string host = DEFAULT_WEBSOCKET_HOST;
            string port = DEFAULT_WEBSOCKET_PORT;
            for (int i = 0; i < args.Length; i++)
            {
                switch (args[i].Trim().ToUpper())
                {
                    case "/H":
                        i++;
                        host = args.Length > i ? args[i] : "";
                        break;
                    case "/P":
                        i++;
                        port = args.Length > i ? args[i] : "";
                        break;
                }
            }
            string url = String.Empty;
            try
            {
                url = GetValidUrl(host, port);
            }
            catch (FormatException)
            {
                Console.Error.WriteLine($"Error: Host ('{host}') and Port ('{port}') parameter do not form a valid URL.");
                Console.Read();
                Environment.Exit(1);
            }
            Console.WriteLine($"Starting GazeServer at {url}");
            GazeServer gazeServer = new GazeServer();
            gazeServer.Start(url);
            Console.Read();
        }

        private static string GetValidUrl(string host, string port)
        {
            string url = $"ws://{host}:{port}";
            if (!Uri.IsWellFormedUriString(url, UriKind.Absolute))
            {
                throw new FormatException();
            }
            return url;
        }
    }
}
